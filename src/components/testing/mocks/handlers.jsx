import { http, HttpResponse } from 'msw';

// Mock data factories
const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user',
  user_type: 'parent',
  subscription_tier: 'free',
  points: 0,
  login_streak: 0,
  onboarding_completed: true,
  ...overrides,
});

const createMockChild = (overrides = {}) => ({
  id: 'child-123',
  name: 'Test Child',
  age: 5,
  birth_date: '2019-01-01',
  grade_level: 'Kindergarten',
  interests: ['art', 'music'],
  challenges: [],
  learning_style: 'visual',
  avatar: '🧒',
  color: '#86efac',
  ...overrides,
});

const createMockActivity = (overrides = {}) => ({
  id: 'activity-123',
  title: 'Test Activity',
  description: 'A fun test activity',
  category: 'creative',
  age_range: { min_age: 3, max_age: 7 },
  duration: '30 minutes',
  materials_needed: ['paper', 'crayons'],
  instructions: ['Step 1', 'Step 2', 'Step 3'],
  learning_objectives: ['creativity', 'fine motor skills'],
  status: 'suggested',
  ...overrides,
});

const createMockTip = (overrides = {}) => ({
  id: 'tip-123',
  title: 'Test Parenting Tip',
  summary: 'A helpful parenting tip for testing',
  why_it_matters: 'This helps with child development',
  action_steps: ['Talk to your child', 'Listen actively'],
  conversation_starter: 'How was your day?',
  category: 'communication',
  age_range: { min_age: 3, max_age: 12 },
  difficulty: 'easy',
  time_required: '5 minutes',
  is_read: false,
  ...overrides,
});

export const handlers = [
  // --- User & Auth ---
  http.get('/api/users/me', () => {
    return HttpResponse.json(createMockUser());
  }),

  http.post('/api/users/login', async ({ request }) => {
    const credentials = await request.json();
    return HttpResponse.json({ 
      user: createMockUser({ email: credentials.email }),
      token: 'mock-jwt-token'
    });
  }),

  http.post('/api/users/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // --- Children ---
  http.get('/api/children', () => {
    return HttpResponse.json([
      createMockChild({ name: 'Jamie', age: 6 }),
      createMockChild({ id: 'child-456', name: 'Alex', age: 8 }),
    ]);
  }),
  
  http.post('/api/children', async ({ request }) => {
    const newChildData = await request.json();
    return HttpResponse.json(createMockChild(newChildData), { status: 201 });
  }),

  http.put('/api/children/:id', async ({ request, params }) => {
    const updates = await request.json();
    return HttpResponse.json(createMockChild({ id: params.id, ...updates }));
  }),

  http.delete('/api/children/:id', ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // --- Activities ---
  http.get('/api/activities', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const childId = url.searchParams.get('child_id');
    const activities = [
      createMockActivity({ title: 'Morning Story Time', status: 'planned' }),
      createMockActivity({ id: 'activity-456', title: 'Build a Fort', status: 'suggested' })
    ];
    let filtered = activities;
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    if (childId) {
      filtered = filtered.filter(a => a.child_id === childId);
    }
    return HttpResponse.json(filtered);
  }),

  http.post('/api/activities', async ({ request }) => {
    const activityData = await request.json();
    return HttpResponse.json(createMockActivity(activityData), { status: 201 });
  }),

  http.put('/api/activities/:id', async ({ request, params }) => {
    const updates = await request.json();
    return HttpResponse.json(createMockActivity({ id: params.id, ...updates }));
  }),

  // --- Parenting Tips ---
  http.get('/api/parenting-tips', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const tips = [
      createMockTip({ title: 'Talk About Feelings', category: 'communication' }),
      createMockTip({ id: 'tip-456', title: 'Set Clear Boundaries', category: 'discipline' })
    ];
    const filtered = category ? tips.filter(t => t.category === category) : tips;
    return HttpResponse.json(filtered);
  }),

  // --- Calendar Events ---
  http.get('/api/calendar-events', ({ request }) => {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    return HttpResponse.json([
      {
        id: 'event-123',
        title: 'Soccer Practice',
        start_time: '2024-01-15T15:00:00Z',
        end_time: '2024-01-15T16:30:00Z',
        all_day: false,
        resource_type: 'custom',
        user_id: 'user-123'
      }
    ]);
  }),

  // --- Sponsorships ---
  http.post('/api/referral-codes/redeem', async ({ request }) => {
    const { code } = await request.json();
    if (code === 'INVALID_CODE') {
      return HttpResponse.json(
        { error: 'Invalid referral code' }, 
        { status: 400 }
      );
    }
    return HttpResponse.json({
      success: true,
      partner: { name: 'Test Partner', benefit_type: 'full_premium' },
      user: createMockUser({ 
        subscription_tier: 'premium',
        sponsorship_code_used: code 
      })
    });
  }),

  // --- AI Assistant ---
  http.post('/api/ai/chat', async ({ request }) => {
    const { message } = await request.json();
    return HttpResponse.json({
      response: `AI Response to: ${message}`,
      suggestions: ['Try this activity', 'Read this tip']
    });
  }),

  // --- Community/Posts ---
  http.get('/api/posts', () => {
    return HttpResponse.json([
      {
        id: 'post-123',
        content: 'Test community post',
        author_name: 'Test Author',
        type: 'general',
        kudos_count: 5,
        reply_count: 2,
        created_date: '2024-01-15T10:00:00Z'
      }
    ]);
  }),

  http.post('/api/posts', async ({ request }) => {
    const postData = await request.json();
    return HttpResponse.json({
      id: 'new-post-123',
      ...postData,
      author_name: 'Test User',
      created_date: new Date().toISOString()
    }, { status: 201 });
  }),

  // --- Error simulation for testing ---
  http.get('/api/error', () => {
    return HttpResponse.json(
      { error: 'Simulated server error' }, 
      { status: 500 }
    );
  }),

  // --- Fallback for unhandled requests ---
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Not implemented in test environment' },
      { status: 501 }
    );
  }),
];