import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createMockUser, createMockChild, createMockActivity } from '../testUtils';

// Mock API responses
export const handlers = [
  // User endpoints
  rest.get('/api/users/me', (req, res, ctx) => {
    return res(ctx.json(createMockUser()));
  }),
  
  rest.put('/api/users/me', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
  
  // Children endpoints
  rest.get('/api/children', (req, res, ctx) => {
    return res(ctx.json([
      createMockChild(),
      createMockChild({ id: 'child-456', name: 'Second Child', age: 8 })
    ]));
  }),
  
  rest.post('/api/children', (req, res, ctx) => {
    return res(ctx.json(createMockChild()));
  }),
  
  rest.put('/api/children/:id', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
  
  rest.delete('/api/children/:id', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  }),
  
  // Activities endpoints
  rest.get('/api/activities', (req, res, ctx) => {
    const activities = Array.from({ length: 10 }, (_, i) => 
      createMockActivity({ 
        id: `activity-${i}`, 
        title: `Activity ${i + 1}` 
      })
    );
    return res(ctx.json(activities));
  }),
  
  rest.post('/api/activities', (req, res, ctx) => {
    return res(ctx.json(createMockActivity()));
  }),
  
  // Calendar events
  rest.get('/api/calendar-events', (req, res, ctx) => {
    return res(ctx.json([]));
  }),
  
  // Local events
  rest.get('/api/local-events', (req, res, ctx) => {
    return res(ctx.json([
      {
        id: 'event-1',
        title: 'Library Story Time',
        description: 'Weekly story time for kids',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        location_name: 'Public Library',
        is_free: true,
      }
    ]));
  }),
  
  // AI Assistant
  rest.post('/api/ai/chat', (req, res, ctx) => {
    return res(ctx.json({
      response: 'This is a mock AI response for testing purposes.',
      suggestions: ['Try this activity', 'Visit this place']
    }));
  }),
  
  // Error simulation endpoints
  rest.get('/api/error/500', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),
  
  rest.get('/api/error/network', (req, res, ctx) => {
    return res.networkError('Network error');
  }),
  
  // Sponsorship endpoints
  rest.post('/api/apply-referral-code', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: 'Referral code applied successfully',
      partner_name: 'Test Partner'
    }));
  }),
  
  // Slow endpoint for performance testing
  rest.get('/api/slow', (req, res, ctx) => {
    return res(
      ctx.delay(2000),
      ctx.json({ message: 'Slow response' })
    );
  }),
];

export const server = setupServer(...handlers);
