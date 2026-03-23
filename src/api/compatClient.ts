import { nhost } from '@/lib/nhostClient';

type UserMetadata = {
  role?: string;
  preferred_active_role?: string;
  full_name?: string;
};

type NhostUser = {
  metadata?: UserMetadata;
  roles?: string[];
  defaultRole?: string;
  displayName?: string;
  email?: string;
} & Record<string, unknown>;

type NhostAuth = {
  getUser?: () => NhostUser | null | Promise<NhostUser | null>;
  signOut?: () => Promise<{ error?: Error | null } | void>;
};

type NhostFunctions = {
  call?: (
    name: string,
    payload: Record<string, unknown>
  ) => Promise<{ data?: unknown; error?: Error | null }>;
};

type CompatUser = NhostUser & {
  role: string;
  preferred_active_role: string;
  full_name?: string;
};

type EntityClient = {
  list: () => Promise<unknown[]>;
  filter: () => Promise<unknown[]>;
  get: () => Promise<null>;
  create: () => Promise<never>;
  update: () => Promise<never>;
  delete: () => Promise<never>;
};

function normalizeUser(nhostUser: NhostUser | null): CompatUser | null {
  if (!nhostUser) return null;

  const role =
    nhostUser.metadata?.role || nhostUser.roles?.[0] || nhostUser.defaultRole || 'parent';

  return {
    ...nhostUser,
    role,
    preferred_active_role: nhostUser.metadata?.preferred_active_role || role,
    full_name: nhostUser.displayName || nhostUser.metadata?.full_name || nhostUser.email
  };
}

function createStubEntities(): Record<string, EntityClient> {
  const entityStub: EntityClient = {
    list: async () => [],
    filter: async () => [],
    get: async () => null,
    create: async () => {
      throw new Error('Entities backend not wired yet (stub).');
    },
    update: async () => {
      throw new Error('Entities backend not wired yet (stub).');
    },
    delete: async () => {
      throw new Error('Entities backend not wired yet (stub).');
    }
  };

  return new Proxy<Record<string, EntityClient>>(
    {},
    {
      get: () => entityStub
    }
  );
}

const nhostClient = nhost as unknown as { auth?: NhostAuth; functions?: NhostFunctions };

export const compatClient = {
  auth: {
    me: async () => {
      const user =
        typeof nhostClient.auth?.getUser === 'function' ? await nhostClient.auth.getUser() : null;
      return normalizeUser(user ?? null);
    },
    logout: async () => {
      if (typeof nhostClient.auth?.signOut === 'function') {
        const res = await nhostClient.auth.signOut();
        if (res && 'error' in res && res.error) throw res.error;
      }
    },
    updateMe: async () => {
      throw new Error('updateMe not implemented for Nhost-backed compat client yet.');
    }
  },
  entities: createStubEntities(),
  functions: {
    invoke: async (name: string, payload: Record<string, unknown> = {}) => {
      if (!nhostClient.functions?.call) throw new Error('Nhost functions not configured.');
      const res = await nhostClient.functions.call(name, payload);
      if (res?.error) throw res.error;
      return res?.data;
    }
  }
};

export default compatClient;
