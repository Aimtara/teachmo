import { clearSavedActiveRole, getSavedActiveRole, saveActiveRole } from '../activeRole';

describe('activeRole storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stores and reads selected role', () => {
    saveActiveRole('teacher');
    expect(getSavedActiveRole()).toBe('teacher');
  });

  it('clears selected role', () => {
    saveActiveRole('district_admin');
    clearSavedActiveRole();
    expect(getSavedActiveRole()).toBeNull();
  });
});
