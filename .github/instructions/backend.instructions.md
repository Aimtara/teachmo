---
applies_to:
  - "backend/**/*.js"
  - "nhost/**/*.js"
  - "backend/**/*.test.js"
---

# Backend Code Instructions

## Express.js API Guidelines

### Route Structure
```javascript
import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET endpoint
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM items WHERE user_id = $1', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// POST endpoint with validation
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  try {
    const result = await query(
      'INSERT INTO items (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

export default router;
```

### Middleware Patterns
```javascript
// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Role-based authorization
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Apply middleware
router.use(requireAuth);
router.get('/admin', requireRole('admin'), adminHandler);
```

## Database Operations

### Using Parameterized Queries
**Always use parameterized queries to prevent SQL injection:**

```javascript
import { query } from '../db.js';

// Good - parameterized query
const result = await query(
  'SELECT * FROM users WHERE email = $1 AND status = $2',
  [email, 'active']
);

// Bad - string concatenation (vulnerable to SQL injection)
const result = await query(`SELECT * FROM users WHERE email = '${email}'`);
```

### Transaction Handling
```javascript
import { getClient } from '../db.js';

async function transferFunds(fromUserId, toUserId, amount) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [amount, fromUserId]
    );
    
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE user_id = $2',
      [amount, toUserId]
    );
    
    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Testing Guidelines

### Jest + Supertest Pattern
```javascript
import request from 'supertest';
import express from 'express';
import myRouter from '../routes/myRouter.js';
import { query } from '../db.js';

// Mock database
jest.mock('../db.js', () => ({
  query: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/items', myRouter);

describe('Items API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('GET /api/items returns items', async () => {
    const mockItems = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];
    
    query.mockResolvedValue({ rows: mockItems });
    
    const response = await request(app).get('/api/items');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockItems);
    expect(query).toHaveBeenCalledWith(expect.any(String));
  });
  
  test('POST /api/items creates new item', async () => {
    const newItem = { id: 1, name: 'New Item' };
    query.mockResolvedValue({ rows: [newItem] });
    
    const response = await request(app)
      .post('/api/items')
      .send({ name: 'New Item' });
    
    expect(response.status).toBe(201);
    expect(response.body).toEqual(newItem);
  });
  
  test('POST /api/items validates required fields', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
  
  test('GET /api/items handles database errors', async () => {
    query.mockRejectedValue(new Error('Database error'));
    
    const response = await request(app).get('/api/items');
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to fetch items');
  });
});
```

### Test Organization
- Place tests in `__tests__/` directory or name as `*.test.js`
- Follow the pattern in `/backend/__tests__/assignments.test.js`
- Mock external dependencies (database, APIs)
- Test success cases, error cases, and validation
- Use descriptive test names

## Nhost Functions

### Serverless Function Pattern
```javascript
// nhost/functions/my-function.js
export default async (req, res) => {
  // Validate request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get authenticated user
  const userId = req.headers['x-hasura-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    // Function logic
    const { data } = req.body;
    
    // Perform operation
    const result = await processData(data);
    
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

### Accessing Hasura from Functions
```javascript
import fetch from 'node-fetch';

const HASURA_ENDPOINT = process.env.NHOST_HASURA_URL;
const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET;

async function queryHasura(query, variables) {
  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const data = await response.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  return data.data;
}
```

## Database Migrations

### Migration File Structure
```sql
-- nhost/migrations/XXX_description/up.sql

-- Create table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_items_user_id ON items(user_id);

-- Set up triggers for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON items TO authenticated;
```

### Migration Best Practices
- Use idempotent operations (`IF NOT EXISTS`, `IF EXISTS`)
- Create both `up.sql` and `down.sql` for reversibility
- Add proper indexes for query performance
- Set up foreign key constraints
- Document complex migrations
- Test migrations locally before deploying

## Error Handling

### Consistent Error Responses
```javascript
// Standard error response format
function sendError(res, statusCode, message, details = null) {
  const error = { error: message };
  if (details) error.details = details;
  return res.status(statusCode).json(error);
}

// Usage
try {
  const result = await performOperation();
  res.json(result);
} catch (error) {
  console.error('Operation failed:', error);
  
  if (error.name === 'ValidationError') {
    return sendError(res, 400, 'Validation failed', error.details);
  }
  
  if (error.code === '23505') { // Unique constraint violation
    return sendError(res, 409, 'Resource already exists');
  }
  
  sendError(res, 500, 'Internal server error');
}
```

### Logging
- Log errors with context for debugging
- Don't log sensitive information (passwords, tokens)
- Use structured logging in production
- Include request IDs for tracing

## Security Best Practices

### Input Validation
```javascript
import { z } from 'zod';

const createItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['type1', 'type2', 'type3']),
  quantity: z.number().int().positive(),
});

router.post('/', async (req, res) => {
  try {
    const validated = createItemSchema.parse(req.body);
    // Use validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input', details: error.errors });
  }
});
```

### Authentication & Authorization
- Verify authentication tokens
- Check user permissions before operations
- Use role-based access control (RBAC)
- Validate user owns resources they're modifying

### Database Security
- Use parameterized queries (never concatenate SQL)
- Apply principle of least privilege for database users
- Encrypt sensitive data at rest
- Use connection pooling with limits

## Performance Optimization

### Query Optimization
```javascript
// Good - select only needed columns
const result = await query(
  'SELECT id, name, email FROM users WHERE status = $1',
  ['active']
);

// Good - use indexes
const result = await query(
  'SELECT * FROM items WHERE user_id = $1 AND created_at > $2',
  [userId, startDate]
);
// Ensure indexes exist: CREATE INDEX idx_items_user_created ON items(user_id, created_at)

// Pagination for large datasets
const result = await query(
  'SELECT * FROM items ORDER BY created_at DESC LIMIT $1 OFFSET $2',
  [limit, offset]
);
```

### Caching Strategies
- Cache frequently accessed, rarely changed data
- Use appropriate cache TTLs
- Invalidate cache on updates
- Consider Redis for distributed caching

## Environment Variables

### Access Configuration
```javascript
// Load from process.env
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;

// Validate required env vars
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}
```

### Environment Files
- Use `.env` for local development
- Never commit `.env` files
- Document required variables in `.env.example`
- Use different variables for dev/staging/prod

## Common Backend Tasks

### Adding a New Endpoint
1. Create route handler in `/backend/routes/`
2. Add validation for request data
3. Implement database operations
4. Handle errors appropriately
5. Write tests in `__tests__/`
6. Update API documentation

### Adding a New Database Table
1. Create migration in `/nhost/migrations/`
2. Define schema with proper types and constraints
3. Add indexes for query performance
4. Set up Hasura permissions
5. Test migration locally with `nhost up`

### Adding a Serverless Function
1. Create function in `/nhost/functions/`
2. Handle authentication and authorization
3. Validate input data
4. Implement business logic
5. Return appropriate responses
6. Test locally and deploy

## Debugging Tips

- Use `console.error()` for error logging
- Check database query logs
- Test endpoints with tools like Postman or curl
- Review Nhost logs for serverless functions
- Use database query analyzers (`EXPLAIN ANALYZE`)

## Documentation

- Document API endpoints with request/response examples
- Add JSDoc comments for complex functions
- Keep README updated with setup instructions
- Document environment variables needed
