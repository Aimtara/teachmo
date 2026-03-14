import { nhost } from '@/lib/nhostClient';

function normalizeUser(nhostUser) {
  if (!nhostUser) return null;

  const role =
    nhostUser?.metadata?.role ||
    nhostUser?.roles?.[0] ||
    nhostUser?.defaultRole ||
    'parent';

  return {
    ...nhostUser,
    role,
    preferred_active_role: nhostUser?.metadata?.preferred_active_role || role,
    full_name: nhostUser?.displayName || nhostUser?.metadata?.full_name || nhostUser?.email
  };
}

function createStubEntities() {
  const entityStub = {
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

  return new Proxy(
    {},
    {
      get: () => entityStub
    }
  );
}

export const compatClient = {
  auth: {
    me: async () => {
      const user = typeof nhost.auth.getUser === 'function' ? await nhost.auth.getUser() : null;
      return normalizeUser(user);
    },
    logout: async () => {
      if (typeof nhost.auth.signOut === 'function') {
        const res = await nhost.auth.signOut();
        if (res?.error) throw res.error;
      }
    },
    updateMe: async () => {
      throw new Error('updateMe not implemented for Nhost-backed compat client yet.');
    }
  },
  entities: createStubEntities(),
  functions: {
    invoke: async (name, payload = {}) => {
      if (!nhost.functions?.call) throw new Error('Nhost functions not configured.');
      const res = await nhost.functions.call(name, payload);
      if (res?.error) throw res.error;
      return res?.data;
    }
  }
};

export default compatClient;
