
import { create } from 'zustand';
import { User } from '@/api/entities';

interface UserState extends User {
  // Add any client-side specific fields if needed
}

interface AppState {
  user: UserState | null;
  isAuthenticated: boolean;
  featureFlags: Record<string, boolean>;
  notifications: any[];
  setUser: (user: UserState | null) => void;
  setFeatureFlags: (flags: Record<string, boolean>) => void;
  addNotification: (notification: any) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  featureFlags: {},
  notifications: [],
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setFeatureFlags: (flags) => set({ featureFlags: flags }),
  addNotification: (notification) => set((state) => ({ 
    notifications: [notification, ...state.notifications] 
  })),
}));
