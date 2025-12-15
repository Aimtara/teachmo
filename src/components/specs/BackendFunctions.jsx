// Backend function testing suite
import { applyReferralCode, manageSponsorships } from '@/api/functions';

// Mock dependencies
global.Deno = {
  env: {
    get: jest.fn((key) => {
      const mockEnv = {
        'BASE44_APP_ID': 'test-app-id',
        'OPENAI_API_KEY': 'test-openai-key'
      };
      return mockEnv[key];
    })
  }
};

// Mock base44 SDK
jest.mock('@base44/sdk', () => ({
  createClient: jest.fn(() => ({
    auth: {
      setToken: jest.fn(),
      me: jest.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' })
    },
    entities: {
      ReferralCode: {
        filter: jest.fn(),
        update: jest.fn()
      },
      SponsorshipPartner: {
        filter: jest.fn(),
        create: jest.fn()
      },
      User: {
        update: jest.fn()
      }
    }
  }))
}));

describe('Backend Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyReferralCode', () => {
    it('successfully applies a valid referral code', async () => {
      const { createClient } = require('@base44/sdk');
      const mockClient = createClient();
      
      // Mock valid code lookup
      mockClient.entities.ReferralCode.filter.mockResolvedValue([
        {
          id: 'code-123',
          code_string: 'VALID_CODE',
          partner_id: 'partner-123',
          redeemed_count: 0,
          redemption_limit: 100,
          is_active: true
        }
      ]);

      // Mock partner lookup
      mockClient.entities.SponsorshipPartner.filter.mockResolvedValue([
        {
          id: 'partner-123',
          name: 'Test Partner',
          benefit_type: 'full_premium',
          licenses_allocated: 100,
          licenses_redeemed: 50
        }
      ]);

      // Mock successful updates
      mockClient.entities.ReferralCode.update.mockResolvedValue({});
      mockClient.entities.User.update.mockResolvedValue({});

      // Create mock request
      const mockRequest = {
        headers: new Map([['Authorization', 'Bearer test-token']]),
        json: () => Promise.resolve({ code: 'VALID_CODE' })
      };

      // Test the function
      const response = await applyReferralCode(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.benefit_applied).toBe('full_premium');
      expect(mockClient.entities.ReferralCode.update).toHaveBeenCalledWith('code-123', {
        redeemed_count: 1
      });
    });

    it('rejects invalid referral code', async () => {
      const { createClient } = require('@base44/sdk');
      const mockClient = createClient();
      
      // Mock empty result for invalid code
      mockClient.entities.ReferralCode.filter.mockResolvedValue([]);

      const mockRequest = {
        headers: new Map([['Authorization', 'Bearer test-token']]),
        json: () => Promise.resolve({ code: 'INVALID_CODE' })
      };

      const response = await applyReferralCode(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired referral code');
    });

    it('handles expired referral code', async () => {
      const { createClient } = require('@base44/sdk');
      const mockClient = createClient();
      
      // Mock expired code
      mockClient.entities.ReferralCode.filter.mockResolvedValue([
        {
          id: 'code-123',
          code_string: 'EXPIRED_CODE',
          partner_id: 'partner-123',
          redeemed_count: 100,
          redemption_limit: 100, // Fully redeemed
          is_active: true
        }
      ]);

      const mockRequest = {
        headers: new Map([['Authorization', 'Bearer test-token']]),
        json: () => Promise.resolve({ code: 'EXPIRED_CODE' })
      };

      const response = await applyReferralCode(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('redemption limit');
    });

    it('requires authentication', async () => {
      const mockRequest = {
        headers: new Map(), // No auth header
        json: () => Promise.resolve({ code: 'TEST_CODE' })
      };

      const response = await applyReferralCode(mockRequest);
      
      expect(response.status).toBe(401);
    });
  });

  describe('manageSponsorships', () => {
    it('creates a new sponsorship partner', async () => {
      const { createClient } = require('@base44/sdk');
      const mockClient = createClient();
      
      mockClient.entities.SponsorshipPartner.create.mockResolvedValue({
        id: 'new-partner-123',
        name: 'New Partner',
        benefit_type: 'discount_percentage',
        benefit_value: 50
      });

      const mockRequest = {
        method: 'POST',
        headers: new Map([['Authorization', 'Bearer test-token']]),
        json: () => Promise.resolve({
          action: 'create_partner',
          data: {
            name: 'New Partner',
            contact_email: 'contact@newpartner.com',
            benefit_type: 'discount_percentage',
            benefit_value: 50,
            licenses_allocated: 200
          }
        })
      };

      const response = await manageSponsorships(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.success).toBe(true);
      expect(result.partner).toBeDefined();
      expect(mockClient.entities.SponsorshipPartner.create).toHaveBeenCalled();
    });

    it('lists existing sponsorship partners', async () => {
      const { createClient } = require('@base44/sdk');
      const mockClient = createClient();
      
      mockClient.entities.SponsorshipPartner.filter.mockResolvedValue([
        { id: '1', name: 'Partner 1', benefit_type: 'full_premium' },
        { id: '2', name: 'Partner 2', benefit_type: 'discount_percentage' }
      ]);

      const mockRequest = {
        method: 'GET',
        headers: new Map([['Authorization', 'Bearer test-token']]),
        url: 'https://example.com/api/sponsorships'
      };

      const response = await manageSponsorships(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.partners).toHaveLength(2);
      expect(result.partners[0].name).toBe('Partner 1');
    });
  });

  describe('Error Handling', () => {
    it('handles database connection errors gracefully', async () => {
      const { createClient } = require('@base44/sdk');
      const mockClient = createClient();
      
      // Mock database error
      mockClient.entities.ReferralCode.filter.mockRejectedValue(
        new Error('Database connection failed')
      );

      const mockRequest = {
        headers: new Map([['Authorization', 'Bearer test-token']]),
        json: () => Promise.resolve({ code: 'TEST_CODE' })
      };

      const response = await applyReferralCode(mockRequest);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toContain('server error');
    });
  });
});