import React from 'react';
import { renderWithProviders, screen, waitFor } from '../testUtils';
import { PerformanceMonitor, expectPerformance, simulateSlowNetwork } from '../performance/PerformanceTestUtils';
import Dashboard from '@/pages/Dashboard';
import ActivityCard from '@/components/activities/ActivityCard';

describe('Performance Tests', () => {
  let performanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    jest.clearAllMocks();
  });

  describe('Component Render Performance', () => {
    it('Dashboard renders within performance threshold', async () => {
      // Mock required entities
      const { User } = require('@/api/entities');
      const { Child } = require('@/api/entities');
      const { Activity } = require('@/api/entities');
      const { ParentingTip } = require('@/api/entities');

      User.me = jest.fn().mockResolvedValue({ full_name: 'Test User' });
      Child.list = jest.fn().mockResolvedValue([]);
      Activity.filter = jest.fn().mockResolvedValue([]);
      ParentingTip.list = jest.fn().mockResolvedValue([]);

      performanceMonitor.startMark('dashboard_render');
      
      renderWithProviders(<Dashboard />);
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
      });
      
      const renderTime = performanceMonitor.endMark('dashboard_render');
      
      expectPerformance.toHaveRenderedFast(renderTime);
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });

    it('ActivityCard renders quickly with complex data', () => {
      const complexActivity = {
        id: 'activity-123',
        title: 'Super Complex Multi-Step Creative Activity with Very Long Title',
        description: 'A very detailed description that includes multiple sentences and comprehensive information about this complex activity that children will enjoy.',
        category: 'creative',
        age_range: { min_age: 3, max_age: 12 },
        duration: '2 hours 30 minutes',
        materials_needed: ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8'],
        instructions: Array(20).fill('Step with detailed instructions'),
        learning_objectives: ['objective1', 'objective2', 'objective3', 'objective4'],
        status: 'suggested',
        is_personalized: true
      };

      performanceMonitor.startMark('activity_card_render');
      
      renderWithProviders(
        <ActivityCard activity={complexActivity} onStatusChange={jest.fn()} />
      );
      
      const renderTime = performanceMonitor.endMark('activity_card_render');
      
      expectPerformance.toHaveRenderedFast(renderTime);
      expect(renderTime).toBeLessThan(50); // Stricter threshold for simple component
    });
  });

  describe('Network Performance', () => {
    it('handles slow network gracefully', async () => {
      const { User } = require('@/api/entities');
      
      // Simulate slow network
      const restoreNetwork = simulateSlowNetwork(2000); // 2 second delay
      
      User.me = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ full_name: 'Test User' }), 2000)
        )
      );

      performanceMonitor.startMark('slow_network_test');
      
      const TestComponent = () => {
        const [user, setUser] = React.useState(null);
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          User.me()
            .then(setUser)
            .finally(() => setLoading(false));
        }, []);
        
        if (loading) return <div>Loading...</div>;
        return <div>User: {user?.full_name}</div>;
      };

      renderWithProviders(<TestComponent />);
      
      // Should show loading immediately
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Wait for slow request to complete
      await waitFor(() => {
        expect(screen.getByText('User: Test User')).toBeInTheDocument();
      }, { timeout: 5000 });
      
      const totalTime = performanceMonitor.endMark('slow_network_test');
      
      // Verify it handled the delay appropriately (should be around 2000ms)
      expect(totalTime).toBeGreaterThan(1900);
      expect(totalTime).toBeLessThan(3000);
      
      restoreNetwork();
    });
  });

  describe('Memory Performance', () => {
    it('does not create memory leaks with multiple renders', async () => {
      const initialMemory = performanceMonitor.getMemoryUsage();
      
      // Render and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(
          <ActivityCard 
            activity={{
              id: `activity-${i}`,
              title: `Activity ${i}`,
              description: `Description ${i}`,
              status: 'suggested'
            }} 
            onStatusChange={jest.fn()} 
          />
        );
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performanceMonitor.getMemoryUsage();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;
        
        // Memory usage should not increase by more than 50%
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        expectPerformance.toBeMemoryEfficient(finalMemory);
      }
    });
  });

  describe('Bundle Analysis', () => {
    it('analyzes bundle composition', () => {
      const bundleAnalysis = performanceMonitor.analyzeBundle();
      
      // Ensure we're not loading too many separate resources
      expect(bundleAnalysis.scriptCount).toBeLessThan(20);
      expect(bundleAnalysis.styleCount).toBeLessThan(10);
      
      // Log bundle info for manual review
      if (isDevelopment) {
        logger.debug('Bundle Analysis:', {
          scripts: bundleAnalysis.scriptCount,
          styles: bundleAnalysis.styleCount,
          total: bundleAnalysis.totalResources
        });
      }
    });
  });

  describe('Interaction Performance', () => {
    it('handles rapid user interactions smoothly', async () => {
      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity',
        status: 'suggested'
      };

      const { Activity } = require('@/api/entities');
      Activity.update = jest.fn().mockResolvedValue({ ...mockActivity, status: 'planned' });

      const { user } = renderWithProviders(
        <ActivityCard activity={mockActivity} onStatusChange={jest.fn()} />
      );

      performanceMonitor.startMark('rapid_interactions');
      
      const planButton = screen.getByRole('button', { name: /plan this/i });
      
      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        await user.click(planButton);
      }
      
      const interactionTime = performanceMonitor.endMark('rapid_interactions');
      
      // Should handle rapid interactions within frame budget (16ms per interaction)
      const avgInteractionTime = interactionTime / 5;
      expect(avgInteractionTime).toBeLessThan(16);
    });
  });
});
