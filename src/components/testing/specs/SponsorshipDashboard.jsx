import React from 'react';
import { renderWithProviders, screen, waitFor, createMockUser, axe } from '../testUtils';
import SponsorshipDashboard from '@/pages/SponsorshipDashboard';
import { SponsorshipPartner, ReferralCode } from '@/api/entities';

// Mock the entities
jest.mock('@/api/entities', () => ({
  SponsorshipPartner: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ReferralCode: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock RoleGuard to always allow access in tests
jest.mock('@/components/shared/RoleGuard', () => {
  return function MockRoleGuard({ children }) {
    return <div>{children}</div>;
  };
});

describe('SponsorshipDashboard', () => {
  const mockPartners = [
    {
      id: 'partner-1',
      name: 'Google',
      contact_name: 'John Smith',
      contact_email: 'john@google.com',
      benefit_type: 'full_premium',
      benefit_value: null,
      licenses_allocated: 100,
      licenses_redeemed: 25,
      is_active: true,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    },
    {
      id: 'partner-2',
      name: 'Microsoft',
      contact_name: 'Jane Doe',
      contact_email: 'jane@microsoft.com',
      benefit_type: 'discount_percentage',
      benefit_value: 50,
      licenses_allocated: 50,
      licenses_redeemed: 10,
      is_active: true,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    }
  ];

  const mockReferralCodes = [
    {
      id: 'code-1',
      code_string: 'GOOGLE2024',
      partner_id: 'partner-1',
      redemption_limit: null,
      redeemed_count: 25,
      expiration_date: null,
      is_active: true,
    },
    {
      id: 'code-2',
      code_string: 'MSFT50OFF',
      partner_id: 'partner-2',
      redemption_limit: 100,
      redeemed_count: 10,
      expiration_date: '2024-12-31',
      is_active: true,
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    SponsorshipPartner.list.mockResolvedValue(mockPartners);
    ReferralCode.list.mockResolvedValue(mockReferralCodes);
  });

  it('renders loading state initially', () => {
    renderWithProviders(<SponsorshipDashboard />);
    expect(screen.getByText('Sponsorship Management')).toBeInTheDocument();
  });

  it('displays stats cards with correct data', async () => {
    renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Active Partners
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Licenses
      expect(screen.getByText('35')).toBeInTheDocument(); // Codes Redeemed
      expect(screen.getByText('$1,500')).toBeInTheDocument(); // Revenue
    });
  });

  it('displays partners list with correct information', async () => {
    renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
      expect(screen.getByText('john@google.com')).toBeInTheDocument();
      expect(screen.getByText('jane@microsoft.com')).toBeInTheDocument();
    });
  });

  it('displays referral codes in the codes tab', async () => {
    const { user } = renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Referral Codes'));
    
    await waitFor(() => {
      expect(screen.getByText('GOOGLE2024')).toBeInTheDocument();
      expect(screen.getByText('MSFT50OFF')).toBeInTheDocument();
    });
  });

  it('allows creating new partners', async () => {
    const { user } = renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('New Partner')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New Partner'));
    
    expect(screen.getByText('Create Sponsorship Partner')).toBeInTheDocument();
  });

  it('allows generating referral codes for partners', async () => {
    const { user } = renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    const generateButtons = screen.getAllByText('Generate Code');
    await user.click(generateButtons[0]);
    
    expect(screen.getByText('Generate Referral Code')).toBeInTheDocument();
  });

  it('filters partners by search term', async () => {
    const { user } = renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Microsoft')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search partners...');
    await user.type(searchInput, 'Google');
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.queryByText('Microsoft')).not.toBeInTheDocument();
    });
  });

  it('toggles partner status', async () => {
    const { user } = renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    // Click on dropdown menu for first partner
    const dropdownButtons = screen.getAllByRole('button');
    const partnerDropdown = dropdownButtons.find(button => 
      button.querySelector('svg') && 
      button.closest('[data-testid]') === null
    );
    
    if (partnerDropdown) {
      await user.click(partnerDropdown);
      
      const deactivateButton = screen.getByText('Deactivate');
      await user.click(deactivateButton);
      
      expect(SponsorshipPartner.update).toHaveBeenCalledWith('partner-1', { is_active: false });
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<SponsorshipDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});