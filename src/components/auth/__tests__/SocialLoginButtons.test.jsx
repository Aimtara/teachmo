import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialLoginButtons, SUPPORTED_PROVIDER_IDS } from '@/components/auth/SocialLoginButtons';

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));

vi.mock('@/lib/nhostClient', () => ({
  nhost: {
    auth: {
      signIn: signInMock,
    },
  },
}));

describe('SocialLoginButtons', () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it('normalizes provider aliases from tenant config before signIn', async () => {
    signInMock.mockResolvedValue({ session: null, error: null });
    const user = userEvent.setup();

    render(<SocialLoginButtons providers={['Azure-AD']} redirectTo="http://localhost/auth/callback" />);

    await user.click(screen.getByRole('button', { name: /continue with microsoft/i }));

    expect(signInMock).toHaveBeenCalledWith({
      provider: 'azuread',
      options: { redirectTo: 'http://localhost/auth/callback' },
    });
  });

  it('surfaces nhost signIn result.error via onError and unlocks buttons', async () => {
    const onError = vi.fn();
    signInMock.mockResolvedValue({ error: new Error('OAuth blocked') });
    const user = userEvent.setup();

    render(<SocialLoginButtons onError={onError} providers={['google']} />);

    const button = screen.getByRole('button', { name: /continue with google/i });
    await user.click(button);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(button).not.toBeDisabled();
  });

  it('filters out unsupported provider IDs from the rendered list', () => {
    render(<SocialLoginButtons providers={['google', 'unsupported-provider', 'notarealthing']} />);

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with unsupported-provider/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with notarealthing/i })).not.toBeInTheDocument();
  });

  it('filters unsupported provider IDs from the rendered list and does not call signIn', async () => {
    const onError = vi.fn();

    // Render with a valid provider so we have a baseline, then switch to invalid.
    const { rerender } = render(<SocialLoginButtons onError={onError} providers={['google']} />);
    // Replace the providers list to include only the bad id — it should be filtered out.
    rerender(<SocialLoginButtons onError={onError} providers={['hack-attempt']} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('SUPPORTED_PROVIDER_IDS contains the expected set of providers', () => {
    const expected = ['google', 'azuread', 'okta', 'classlink', 'clever', 'github', 'facebook', 'saml'];
    for (const id of expected) {
      expect(SUPPORTED_PROVIDER_IDS.has(id)).toBe(true);
    }
  });
});
