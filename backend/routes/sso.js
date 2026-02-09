/* eslint-env node */
import { Router } from 'express';
import passport from 'passport';
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { createLogger } from '../utils/logger.js';
import { issueSsoJwt } from '../utils/ssoJwt.js';
import {
  buildOidcConfig,
  buildSamlConfig,
  loadSsoSettings,
  resolveOrganizationId,
} from '../utils/ssoProviders.js';

const logger = createLogger('routes.sso');
const router = Router();

const ssoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 SSO start requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});
const strategyCache = new Map();

function ensureStrategyName({ provider, organizationId }) {
  return `sso-${provider}-${organizationId}`;
}

function baseUrlFromRequest(req) {
  const explicit = process.env.SSO_BASE_URL || process.env.API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function extractProfileEmail(profile) {
  if (!profile) return null;
  if (profile.email) return profile.email;
  if (profile.emails?.length) return profile.emails[0]?.value || null;
  const samlEmail =
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn'];
  return samlEmail || null;
}

function normalizeProfileName(profile) {
  if (!profile) return null;
  if (profile.displayName) return profile.displayName;
  if (profile.cn) return profile.cn;
  if (profile.name?.formatted) return profile.name.formatted;
  const given = profile.name?.givenName || profile.given_name || '';
  const family = profile.name?.familyName || profile.family_name || '';
  const joined = `${given} ${family}`.trim();
  return joined || null;
}

async function upsertSsoUser({ email, displayName, organizationId, schoolId, role }) {
  const existing = await query(
    `select id, email, display_name
     from auth.users
     where email = $1
     limit 1`,
    [email]
  );

  let userId = existing.rows?.[0]?.id;
  if (!userId) {
    const created = await query(
      `insert into auth.users (email, display_name)
       values ($1, $2)
       returning id`,
      [email, displayName || email]
    );
    userId = created.rows?.[0]?.id;
  }

  await query(
    `insert into public.user_profiles (user_id, role, district_id, school_id, full_name)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update
     set role = excluded.role,
         district_id = excluded.district_id,
         school_id = excluded.school_id,
         full_name = excluded.full_name,
         updated_at = now()`,
    [userId, role, organizationId, schoolId ?? null, displayName || null]
  );

  return userId;
}

function parseOidcArgs(args) {
  const done = args[args.length - 1];
  const req = args[0] && args[0].ssoContext ? args[0] : null;
  const profile = args.find((arg) => arg && typeof arg === 'object' && (arg.emails || arg.email || arg.id));
  return { req, profile, done };
}

async function finalizeSsoLogin({ req, profile, provider }) {
  const email = extractProfileEmail(profile);
  if (!email) {
    throw new Error('SSO profile missing email');
  }

  const { organizationId, schoolId } = req.ssoContext || {};
  if (!organizationId) throw new Error('Missing organization scope for SSO');

  const role = req.ssoContext?.defaultRole || 'parent';
  const displayName = normalizeProfileName(profile);

  const userId = await upsertSsoUser({
    email,
    displayName,
    organizationId,
    schoolId,
    role,
  });

  const token = await issueSsoJwt({
    userId,
    role,
    organizationId,
    schoolId,
    provider,
    email,
  });

  return { token, userId, email, role };
}

async function ensureStrategy({ provider, organizationId, baseUrl }) {
  const cacheKey = ensureStrategyName({ provider, organizationId });
  if (strategyCache.has(cacheKey)) return cacheKey;

  const settings = await loadSsoSettings({ provider, organizationId });
  if (!settings) {
    throw new Error('SSO provider not configured');
  }

  if (provider === 'saml') {
    const config = buildSamlConfig({ settings, baseUrl });
    const strategy = new SamlStrategy(config, async (req, profile, done) => {
      try {
        const result = await finalizeSsoLogin({ req, profile, provider });
        done(null, result);
      } catch (error) {
        done(error);
      }
    });
    passport.use(cacheKey, strategy);
  } else {
    const config = buildOidcConfig({ settings, baseUrl });
    const strategy = new OpenIDConnectStrategy(config, async (...args) => {
      const { req, profile, done } = parseOidcArgs(args);
      try {
        const result = await finalizeSsoLogin({ req, profile, provider });
        done(null, result);
      } catch (error) {
        done(error);
      }
    });
    passport.use(cacheKey, strategy);
  }

  strategyCache.set(cacheKey, true);
  return cacheKey;
}

router.get('/:provider/start', ssoRateLimiter, async (req, res, next) => {
  const provider = String(req.params.provider || '').toLowerCase();
  try {
    const organizationId = await resolveOrganizationId({
      organizationId: req.query.organizationId,
      email: req.query.email,
    });

    if (!organizationId) {
      return res.status(400).json({ error: 'organization_required' });
    }

    const baseUrl = baseUrlFromRequest(req);
    const strategyName = await ensureStrategy({ provider, organizationId, baseUrl });
    req.ssoContext = {
      organizationId,
      schoolId: req.query.schoolId || null,
      defaultRole: req.query.defaultRole || null,
    };

    const statePayload = Buffer.from(JSON.stringify(req.ssoContext)).toString('base64url');

    return passport.authenticate(strategyName, {
      session: false,
      ...(provider === 'saml' ? { RelayState: statePayload } : { state: statePayload }),
    })(req, res, next);
  } catch (error) {
    logger.error('Failed to start SSO', error);
    return res.status(500).json({ error: 'sso_start_failed' });
  }
});

router.all('/:provider/callback', ssoRateLimiter, async (req, res, next) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const baseUrl = baseUrlFromRequest(req);

  try {
    const state = req.body?.RelayState || req.query?.state;
    if (state) {
      try {
        req.ssoContext = JSON.parse(Buffer.from(String(state), 'base64url').toString('utf8'));
      } catch {
        req.ssoContext = null;
      }
    }

    if (!req.ssoContext?.organizationId) {
      const organizationId = await resolveOrganizationId({
        organizationId: req.query.organizationId,
        email: req.query.email,
      });
      req.ssoContext = {
        organizationId,
        schoolId: req.query.schoolId || null,
        defaultRole: req.query.defaultRole || null,
      };
    }

    const strategyName = await ensureStrategy({
      provider,
      organizationId: req.ssoContext?.organizationId,
      baseUrl,
    });

    return passport.authenticate(strategyName, { session: false }, (err, result) => {
      if (err || !result) {
        logger.error('SSO callback failed', err);
        return res.status(401).json({ error: 'sso_callback_failed' });
      }

      const redirectTo = req.query.redirectTo || process.env.SSO_REDIRECT_URL;
      if (redirectTo) {
        const url = new URL(String(redirectTo));
        url.searchParams.set('token', result.token);
        return res.redirect(url.toString());
      }

      return res.json({
        token: result.token,
        userId: result.userId,
        email: result.email,
        role: result.role,
      });
    })(req, res, next);
  } catch (error) {
    logger.error('SSO callback error', error);
    return res.status(500).json({ error: 'sso_callback_failed' });
  }
});

router.get('/:provider/metadata', async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (provider !== 'saml') {
    return res.status(404).json({ error: 'metadata_not_supported' });
  }
  try {
    const organizationId = await resolveOrganizationId({
      organizationId: req.query.organizationId,
      email: req.query.email,
    });
    if (!organizationId) return res.status(400).json({ error: 'organization_required' });

    const baseUrl = baseUrlFromRequest(req);
    const strategyName = await ensureStrategy({ provider, organizationId, baseUrl });
    const strategy = passport._strategy(strategyName);
    if (!strategy?.generateServiceProviderMetadata) {
      return res.status(500).json({ error: 'metadata_unavailable' });
    }
    const metadata = strategy.generateServiceProviderMetadata();
    res.type('application/xml');
    res.send(metadata);
  } catch (error) {
    logger.error('Failed to generate SAML metadata', error);
    res.status(500).json({ error: 'metadata_failed' });
  }
});

router.post('/test/resolve', async (req, res) => {
  const { email, organizationId, provider } = req.body || {};
  const resolvedOrg = await resolveOrganizationId({ organizationId, email });
  const settings = await loadSsoSettings({ provider, organizationId: resolvedOrg });
  res.json({ organizationId: resolvedOrg, enabled: Boolean(settings) });
});

export default router;
