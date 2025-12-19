import { createClient } from "@base44/sdk";
import { nhost } from "@/lib/nhostClient";

/**
 * If VITE_BASE44_APP_ID is set, we create the real Base44 client.
 * If not set, we create a Nhost-backed compatibility client that:
 * - provides base44.auth.me() via Nhost user
 * - provides base44.functions.invoke() via Nhost functions
 * - provides base44.entities.* as safe stubs (read = empty, write = throws)
 *
 * This lets Base44 UI land without hard-wiring the backend migration yet.
 */
const appId = import.meta.env.VITE_BASE44_APP_ID;

function normalizeUser(nhostUser) {
  if (!nhostUser) return null;

  const role =
    nhostUser?.metadata?.role ||
    nhostUser?.roles?.[0] ||
    nhostUser?.defaultRole ||
    "parent";

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
      throw new Error("Entities backend not wired yet (stub).");
    },
    update: async () => {
      throw new Error("Entities backend not wired yet (stub).");
    },
    delete: async () => {
      throw new Error("Entities backend not wired yet (stub).");
    }
  };

  return new Proxy(
    {},
    {
      get: () => entityStub
    }
  );
}

function createCompatClient() {
  return {
    auth: {
      me: async () => {
        const user = typeof nhost.auth.getUser === "function" ? nhost.auth.getUser() : null;
        return normalizeUser(user);
      },
      logout: async () => {
        if (typeof nhost.auth.signOut === "function") {
          const res = await nhost.auth.signOut();
          if (res?.error) throw res.error;
        }
      },
      updateMe: async () => {
        throw new Error("updateMe not implemented for Nhost-backed compat client yet.");
      }
    },
    entities: createStubEntities(),
    functions: {
      invoke: async (name, payload = {}) => {
        if (!nhost.functions?.call) throw new Error("Nhost functions not configured.");
        const res = await nhost.functions.call(name, payload);
        if (res?.error) throw res.error;
        return res?.data;
      }
    }
  };
}

export const base44 = appId
  ? createClient({ appId, requiresAuth: true })
  : createCompatClient();
