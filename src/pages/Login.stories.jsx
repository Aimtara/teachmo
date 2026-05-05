import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

const authState = { isAuthenticated: false, isLoading: false };

const tenantSsoState = {
  data: {
    requireSso: false,
    providers: [],
  },
};

export default {
  title: 'Launch/Auth/Login',
  component: Login,
  parameters: {
    layout: 'fullscreen',
  },
};

export const ParentSignIn = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/login?flow=parent']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  beforeEach: () => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  },
  args: {},
};

export const DistrictSsoPrompt = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/login?flow=district']}>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'District onboarding sign-in state used as a Chromatic baseline for SSO messaging.',
      },
    },
  },
};

// Storybook/Vitest test setup mocks @nhost/react and useTenantSSOSettings in
// several suites, but standalone Storybook needs stable globals for this page.
window.__TEACHMO_STORYBOOK_AUTH__ = authState;
window.__TEACHMO_STORYBOOK_TENANT_SSO__ = tenantSsoState;
