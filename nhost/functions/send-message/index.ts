import type { Request, Response } from 'express';
import { createLogger } from '../_shared/logger';
import { getHasuraErrorMessage } from '../_shared/hasuraTypes';
import { notifyUserEvent } from '../_shared/notifier';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { getActorScope } from '../_shared/tenantScope';
import type { HasuraClient, HasuraResponse } from '../_shared/hasuraTypes';

const logger = createLogger('send-message');

const RATE_WINDOWS = [
  { windowSeconds: 60, limit: 10 },
  { windowSeconds: 86400, limit: 100 },
];

const PROFANITY_LIST = String(process.env.SAFETY_PROFANITY_LIST ?? '')
  .split(',')
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

const LINK_FLAG_THRESHOLD = Number(process.env.SAFETY_LINK_FLAG_THRESHOLD ?? 3);
const BURST_FLAG_THRESHOLD = Number(process.env.SAFETY_BURST_FLAG_THRESHOLD ?? 8);

function windowStart(seconds: number): string {
  const now = Date.now();
  const windowMs = seconds * 1000;
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

type GraphQLError = {
  message: string;
  extensions?: Record<string, unknown>;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
};

type HasuraResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

type HasuraClient = <T>(query: string, variables?: Record<string, unknown>) => Promise<HasuraResponse<T>>;

function makeHasuraClient(): HasuraClient {
  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) {
    throw new Error('Missing Hasura configuration');
  }

  return async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = (await response.json()) as HasuraResponse<unknown>;
