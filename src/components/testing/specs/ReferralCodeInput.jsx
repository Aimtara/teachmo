import React from 'react';
import { renderWithProviders, screen, waitFor, axe } from '../testUtils';
import ReferralCodeInput from '@/components/onboarding/ReferralCodeInput';
import { applyReferralCode } from '@/api/functions';

// Mock the backend function
jest.mock('@/api/functions', () => ({
  applyReferralCode: jest.fn(),
}));

describe('ReferralCodeInput', () => {
  const mockOnCodeApplied = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the referral code input form', () => {
    renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    expect(screen.getByText('Have a Referral Code?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('COMPANY2024')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  it('converts input to uppercase automatically', async () => {
    const { user } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const input = screen.getByPlaceholderText('COMPANY2024');
    await user.type(input, 'google2024');
    
    expect(input.value).toBe('GOOGLE2024');
  });

  it('applies a valid referral code successfully', async () => {
    const mockBenefit = {
      description: '50% discount on premium subscription',
      partner_name: 'Google',
    };
    
    applyReferralCode.mockResolvedValue({
      data: {
        success: true,
        benefit: mockBenefit,
      },
    });
    
    const { user } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const input = screen.getByPlaceholderText('COMPANY2024');
    await user.type(input, 'GOOGLE2024');
    
    const applyButton = screen.getByText('Apply');
    await user.click(applyButton);
    
    await waitFor(() => {
      expect(applyReferralCode).toHaveBeenCalledWith({ code: 'GOOGLE2024' });
      expect(mockOnCodeApplied).toHaveBeenCalledWith(mockBenefit);
      expect(screen.getByText('Referral Code Applied!')).toBeInTheDocument();
      expect(screen.getByText('50% discount on premium subscription')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
  });

  it('shows error for invalid referral code', async () => {
    applyReferralCode.mockResolvedValue({
      data: {
        success: false,
        message: 'Invalid or expired code',
      },
    });
    
    const { user } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const input = screen.getByPlaceholderText('COMPANY2024');
    await user.type(input, 'INVALID');
    
    const applyButton = screen.getByText('Apply');
    await user.click(applyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid or expired code')).toBeInTheDocument();
      expect(mockOnCodeApplied).not.toHaveBeenCalled();
    });
  });

  it('handles network errors gracefully', async () => {
    applyReferralCode.mockRejectedValue(new Error('Network error'));
    
    const { user } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const input = screen.getByPlaceholderText('COMPANY2024');
    await user.type(input, 'GOOGLE2024');
    
    const applyButton = screen.getByText('Apply');
    await user.click(applyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to apply code. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables apply button when no code is entered', () => {
    renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const applyButton = screen.getByText('Apply');
    expect(applyButton).toBeDisabled();
  });

  it('shows loading state while applying code', async () => {
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    applyReferralCode.mockReturnValue(promise);
    
    const { user } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const input = screen.getByPlaceholderText('COMPANY2024');
    await user.type(input, 'GOOGLE2024');
    
    const applyButton = screen.getByText('Apply');
    await user.click(applyButton);
    
    // Should show loading state
    expect(applyButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    
    // Resolve the promise
    resolvePromise({
      data: { success: true, benefit: { description: 'Test benefit', partner_name: 'Test' } }
    });
    
    await waitFor(() => {
      expect(screen.getByText('Referral Code Applied!')).toBeInTheDocument();
    });
  });

  it('applies code when Enter key is pressed', async () => {
    applyReferralCode.mockResolvedValue({
      data: {
        success: true,
        benefit: { description: 'Test benefit', partner_name: 'Test' },
      },
    });
    
    const { user } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const input = screen.getByPlaceholderText('COMPANY2024');
    await user.type(input, 'GOOGLE2024');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(applyReferralCode).toHaveBeenCalledWith({ code: 'GOOGLE2024' });
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<ReferralCodeInput onCodeApplied={mockOnCodeApplied} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});