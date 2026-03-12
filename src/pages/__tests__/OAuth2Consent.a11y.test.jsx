import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import OAuth2Consent from '@/pages/OAuth2Consent.jsx';

expect.extend(toHaveNoViolations);

const NEVER_RESOLVING = new Promise(() => {});

jest.mock('@nhost/react', () => ({
  useAuthenticationStatus: jest.fn(() => ({ isAuthenticated: false, isLoading: false })),
}));

jest.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      oauth2LoginGet: jest.fn(),
      oauth2LoginPost: jest.fn(),
    },
  },
}));

const { useAuthenticationStatus } = require('@nhost/react');
const { nhost } = require('@/lib/nhostClient');
const mockOauth2LoginGet = nhost.auth.oauth2LoginGet;
const mockOauth2LoginPost = nhost.auth.oauth2LoginPost;

function renderConsent(search = '?request_id=test-req-1') {
  return render(
    <MemoryRouter initialEntries={[`/oauth2/login${search}`]}>
      <OAuth2Consent />
    </MemoryRouter>
  );
}

const sampleDetails = {
  clientId: 'client-abc',
  redirectUri: 'https://example.com/callback',
  scopes: ['openid', 'profile'],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAuthenticationStatus.mockReturnValue({ isAuthenticated: false, isLoading: false });
});

describe('OAuth2Consent – accessibility', () => {
  it('passes a11y checks in the loading state', async () => {
    mockOauth2LoginGet.mockReturnValue(NEVER_RESOLVING);
    const { container } = renderConsent();
    expect(screen.getByText(/loading authorization request/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes a11y checks when request_id is missing (error state)', async () => {
    const { container } = renderConsent('');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes a11y checks with unauthenticated sign-in form', async () => {
    mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    const { container } = renderConsent();
    await screen.findByText(/client-abc/i);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('passes a11y checks with authenticated approve/deny buttons', async () => {
    useAuthenticationStatus.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    const { container } = renderConsent();
    await screen.findByRole('button', { name: /approve and continue/i });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('OAuth2Consent – behaviour', () => {
  it('shows loading text while fetching request details', () => {
    mockOauth2LoginGet.mockReturnValue(NEVER_RESOLVING);
    renderConsent();
    expect(screen.getByText(/loading authorization request/i)).toBeInTheDocument();
  });

  it('renders request details after successful fetch', async () => {
    mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    renderConsent();
    await screen.findByText('client-abc');
    expect(screen.getByText('https://example.com/callback')).toBeInTheDocument();
    expect(screen.getByText('openid')).toBeInTheDocument();
    expect(screen.getByText('profile')).toBeInTheDocument();
  });

  it('shows an error alert when the API call fails', async () => {
    mockOauth2LoginGet.mockRejectedValue(new Error('Request not found'));
    renderConsent();
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/request not found/i);
  });

  it('shows an error alert when request_id is absent', async () => {
    renderConsent('');
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent(/missing request_id/i);
  });

  it('shows sign-in form for unauthenticated users after details load', async () => {
    mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    renderConsent();
    await screen.findByText('client-abc');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows approve and deny controls for authenticated users', async () => {
    useAuthenticationStatus.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    renderConsent();
    await screen.findByRole('button', { name: /approve and continue/i });
    expect(screen.getByRole('button', { name: /deny access/i })).toBeInTheDocument();
  });

  it('disables the approve button while the approval request is in flight', async () => {
    useAuthenticationStatus.mockReturnValue({ isAuthenticated: true, isLoading: false });
    mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    mockOauth2LoginPost.mockReturnValue(NEVER_RESOLVING);

    renderConsent();
    const approveBtn = await screen.findByRole('button', { name: /approve and continue/i });

    await act(async () => {
      await userEvent.click(approveBtn);
    });

    expect(screen.getByRole('button', { name: /approving/i })).toBeDisabled();
  });

  describe('approval redirect handling', () => {
    let assignHref;

    beforeEach(() => {
      assignHref = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { ...window.location, set href(v) { assignHref(v); } },
        writable: true,
      });
      useAuthenticationStatus.mockReturnValue({ isAuthenticated: true, isLoading: false });
      mockOauth2LoginGet.mockResolvedValue({ body: sampleDetails });
    });

    async function clickApprove() {
      renderConsent();
      const approveBtn = await screen.findByRole('button', { name: /approve and continue/i });
      await act(async () => {
        await userEvent.click(approveBtn);
      });
    }

    it('redirects to redirectUri (camelCase) from approval response', async () => {
      mockOauth2LoginPost.mockResolvedValue({
        body: { redirectUri: 'https://example.com/callback?code=abc' },
      });
      await clickApprove();
      expect(assignHref).toHaveBeenCalledWith('https://example.com/callback?code=abc');
    });

    it('redirects to redirect_uri (snake_case) from approval response', async () => {
      mockOauth2LoginPost.mockResolvedValue({
        body: { redirect_uri: 'https://example.com/callback?code=xyz' },
      });
      await clickApprove();
      expect(assignHref).toHaveBeenCalledWith('https://example.com/callback?code=xyz');
    });

    it('shows an error when approval response has no redirect URI', async () => {
      mockOauth2LoginPost.mockResolvedValue({ body: {} });
      await clickApprove();
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/no redirect uri/i)
      );
    });
  });
});
