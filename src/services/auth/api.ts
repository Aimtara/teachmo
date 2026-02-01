import { apiClient } from '../core/client';

export interface AuthUser {
  id: string;
  role?: string;
  preferred_active_role?: string;
  [key: string]: unknown;
}

export const AuthService = {
  me: () => apiClient.auth.me<AuthUser>(),
  logout: () => apiClient.auth.logout(),
  updateProfile: (payload: Record<string, unknown>) => apiClient.auth.updateMe<AuthUser>(payload),
};
