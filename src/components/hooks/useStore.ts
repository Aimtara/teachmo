import { create } from 'zustand';

export type UserState = {
  id?: string;
  email?: string;
  user_type?: string;
  displayName?: string;
  role?: string;
  [key: string]: unknown;
};

export type AppState = {
  user: UserState | null;
  isAuthenticated: boolean;
  featureFlags: Record<string, boolean>;
  notifications: Record<string, unknown>[];
  setUser: (user: UserState | null) => void;
  setFeatureFlags: (flags: Record<string, boolean>) => void;
  addNotification: (notification: Record<string, unknown>) => void;
};

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  featureFlags: {},
  notifications: [],
  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  setFeatureFlags: (flags) => set({ featureFlags: flags }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications]
    }))
}));
