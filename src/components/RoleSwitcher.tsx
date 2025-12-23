import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Role } from '@/security/permissions';

type RoleSwitcherProps = {
  availableRoles?: Role[];
  defaultRole?: Role;
  onChange?: (role: Role) => void;
  storageKey?: string;
};

const DEFAULT_ROLES: Role[] = ['parent', 'teacher', 'school_admin', 'district_admin', 'partner', 'admin', 'system_admin'];
const DEFAULT_STORAGE_KEY = 'teachmo.activeRole';

function readPersistedRole(storageKey: string, fallback: Role): Role {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey) as Role | null;
    return stored ?? fallback;
  } catch {
    return fallback;
  }
}

function writePersistedRole(storageKey: string, role: Role) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, role);
  } catch (error) {
    console.warn('Unable to persist role selection', error);
  }
}

export default function RoleSwitcher({
  availableRoles = DEFAULT_ROLES,
  defaultRole = 'parent',
  onChange,
  storageKey = DEFAULT_STORAGE_KEY,
}: RoleSwitcherProps) {
  const safeDefaultRole = useMemo(() => (availableRoles.includes(defaultRole) ? defaultRole : availableRoles[0]), [availableRoles, defaultRole]);
  const [activeRole, setActiveRole] = useState<Role>(() => readPersistedRole(storageKey, safeDefaultRole));

  useEffect(() => {
    writePersistedRole(storageKey, activeRole);
  }, [activeRole, storageKey]);

  useEffect(() => {
    // Keep in sync with default changes (e.g., from user profile updates)
    if (activeRole !== safeDefaultRole && !availableRoles.includes(activeRole)) {
      setActiveRole(safeDefaultRole);
    }
  }, [activeRole, availableRoles, safeDefaultRole]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextRole = event.target.value as Role;
      setActiveRole(nextRole);
      writePersistedRole(storageKey, nextRole);
      onChange?.(nextRole);
    },
    [onChange, storageKey],
  );

  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      Role
      <select
        aria-label="Switch user role"
        className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        onChange={handleChange}
        value={activeRole}
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {role.replace('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}
