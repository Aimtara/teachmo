const ACTIVE_ROLE_KEY = 'teachmo:active-role';

export function getSavedActiveRole(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ACTIVE_ROLE_KEY);
}

export function saveActiveRole(role: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (!role) {
    window.sessionStorage.removeItem(ACTIVE_ROLE_KEY);
    return;
  }
  window.sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function clearSavedActiveRole(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ACTIVE_ROLE_KEY);
}
