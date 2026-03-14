import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons';

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
});
