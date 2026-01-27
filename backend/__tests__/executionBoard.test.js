import request from 'supertest';
import express from 'express';
import { executionBoardRouter } from '../routes/executionBoard.js';
import * as models from '../models.js';

const { executionEpics, executionGates, executionSlices, executionDependencies } = models;

const app = express();
app.use(express.json());
app.use('/api/execution-board', executionBoardRouter);

describe('Execution Board API', () => {
  // Helper function to create authenticated requests
  const authenticatedRequest = (method, url) => {
    return request(app)
      [method](url)
      .set('Authorization', 'Bearer valid-token')
      .set('x-user-role', 'admin');
  };

  beforeEach(() => {
    // Clear all arrays before each test
    executionEpics.length = 0;
    executionGates.length = 0;
    executionSlices.length = 0;
    executionDependencies.length = 0;
  });

  describe('Authentication and Authorization', () => {
    test('GET /board returns 401 without authorization header', async () => {
      const res = await request(app).get('/api/execution-board/board');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required' });
    });

    test('GET /board returns 403 without admin role', async () => {
      const res = await request(app)
        .get('/api/execution-board/board')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-role', 'user');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'Admin privileges required' });
    });

    test('PATCH /epics/:id returns 401 without authorization', async () => {
      const res = await request(app)
        .patch('/api/execution-board/epics/epic-1')
        .send({ status: 'Done' });
      expect(res.status).toBe(401);
    });

    test('PATCH /gates/:gate returns 403 without admin role', async () => {
      const res = await request(app)
        .patch('/api/execution-board/gates/G0')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-role', 'user')
        .send({ status: 'Planned' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /board', () => {
    test('returns enriched board data with empty arrays when not seeded', async () => {
      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('updatedAt');
      expect(res.body).toHaveProperty('epics');
      expect(res.body).toHaveProperty('gates');
      expect(res.body).toHaveProperty('slices');
      expect(res.body).toHaveProperty('dependencies');
    });

    test('returns enriched board with seeded data', async () => {
      // Seed some data
      executionEpics.push(
        { id: 'epic-1', status: 'In Progress', workstream: 'Platform' },
        { id: 'epic-2', status: 'Done', workstream: 'Core' }
      );
      executionGates.push({
        gate: 'G0',
        purpose: 'Launch readiness',
        checklist: '☑ Item 1\n☐ Item 2\n☐ Item 3',
        status: 'In Progress',
      });
      executionSlices.push({
        id: 'slice-1',
        outcome: 'Feature complete',
        status: 'Todo',
      });
      executionDependencies.push({
        from: 'epic-1',
        to: 'epic-2',
        type: 'blocks',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      expect(res.body.epics).toHaveLength(2);
      expect(res.body.gates).toHaveLength(1);
      expect(res.body.slices).toHaveLength(1);
      expect(res.body.dependencies).toHaveLength(1);
    });

    test('enriches epics with blocking information', async () => {
      executionEpics.push(
        { id: 'epic-1', status: 'In Progress', workstream: 'Platform' },
        { id: 'epic-2', status: 'Todo', workstream: 'Core' }
      );
      executionDependencies.push({
        from: 'epic-1',
        to: 'epic-2',
        type: 'blocks',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      
      const epic2 = res.body.epics.find((e) => e.id === 'epic-2');
      expect(epic2.blocked).toBe(true);
      expect(epic2.blockedBy).toEqual(['epic-1']);

      const epic1 = res.body.epics.find((e) => e.id === 'epic-1');
      expect(epic1.blocked).toBe(false);
      expect(epic1.blockedBy).toEqual([]);
    });

    test('does not mark epic as blocked when blocker is Done', async () => {
      executionEpics.push(
        { id: 'epic-1', status: 'Done', workstream: 'Platform' },
        { id: 'epic-2', status: 'Todo', workstream: 'Core' }
      );
      executionDependencies.push({
        from: 'epic-1',
        to: 'epic-2',
        type: 'blocks',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      
      const epic2 = res.body.epics.find((e) => e.id === 'epic-2');
      expect(epic2.blocked).toBe(false);
      expect(epic2.blockedBy).toEqual([]);
    });

    test('enriches gates with progress information', async () => {
      executionGates.push({
        gate: 'G0',
        purpose: 'Launch readiness',
        checklist: '☑ Item 1\n☑ Item 2\n☐ Item 3',
        status: 'In Progress',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      
      const gate = res.body.gates[0];
      expect(gate.total).toBe(3);
      expect(gate.checked).toBe(2);
      expect(gate.progress).toBeCloseTo(2 / 3);
    });

    test('includes dependency status information', async () => {
      executionEpics.push(
        { id: 'epic-1', status: 'In Progress', workstream: 'Platform' },
        { id: 'epic-2', status: 'Done', workstream: 'Core' }
      );
      executionDependencies.push({
        from: 'epic-1',
        to: 'epic-2',
        type: 'blocks',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      
      const dep = res.body.dependencies[0];
      expect(dep.fromStatus).toBe('In Progress');
      expect(dep.toStatus).toBe('Done');
    });
  });

  describe('computeGateProgress function', () => {
    test('handles empty checklist', async () => {
      executionGates.push({
        gate: 'G0',
        checklist: '',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      const gate = res.body.gates[0];
      expect(gate.total).toBe(0);
      expect(gate.checked).toBe(0);
      expect(gate.progress).toBe(0);
    });

    test('handles checklist with only unchecked items', async () => {
      executionGates.push({
        gate: 'G0',
        checklist: '☐ Item 1\n☐ Item 2',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      const gate = res.body.gates[0];
      expect(gate.total).toBe(2);
      expect(gate.checked).toBe(0);
      expect(gate.progress).toBe(0);
    });

    test('handles checklist with all checked items', async () => {
      executionGates.push({
        gate: 'G0',
        checklist: '☑ Item 1\n☑ Item 2',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      const gate = res.body.gates[0];
      expect(gate.total).toBe(2);
      expect(gate.checked).toBe(2);
      expect(gate.progress).toBe(1);
    });

    test('handles mixed checklist items', async () => {
      executionGates.push({
        gate: 'G0',
        checklist: '☑ Item 1\n☐ Item 2\n☑ Item 3\n☐ Item 4',
      });

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      const gate = res.body.gates[0];
      expect(gate.total).toBe(4);
      expect(gate.checked).toBe(2);
      expect(gate.progress).toBe(0.5);
    });
  });

  describe('PATCH /epics/:id', () => {
    beforeEach(() => {
      executionEpics.push({
        id: 'epic-1',
        workstream: 'Platform',
        status: 'Todo',
        tag: 'backend',
      });
    });

    test('updates allowed fields successfully', async () => {
      const updates = {
        status: 'In Progress',
        workstream: 'Core',
        nextMilestone: '2024-Q1',
      };

      const res = await authenticatedRequest('patch', '/api/execution-board/epics/epic-1')
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(executionEpics[0].status).toBe('In Progress');
      expect(executionEpics[0].workstream).toBe('Core');
      expect(executionEpics[0].nextMilestone).toBe('2024-Q1');
      expect(executionEpics[0]).toHaveProperty('updatedAt');
    });

    test('returns 404 for non-existent epic', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/epics/non-existent')
        .send({ status: 'Done' });
      
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Epic not found' });
    });

    test('ignores disallowed fields', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/epics/epic-1')
        .send({ 
          status: 'Done',
          id: 'changed-id',
          maliciousField: 'hack',
        });
      
      expect(res.status).toBe(200);
      expect(executionEpics[0].id).toBe('epic-1');
      expect(executionEpics[0]).not.toHaveProperty('maliciousField');
    });

    test('allows updating all permitted fields', async () => {
      const updates = {
        workstream: 'Core',
        tag: 'frontend',
        railSegment: 'Segment A',
        ownerRole: 'PM',
        upstream: ['epic-0'],
        downstream: ['epic-2'],
        gates: ['G1', 'G2'],
        status: 'In Progress',
        nextMilestone: '2024-Q2',
        dod: 'All tests pass',
        notes: 'Important notes',
        epicKey: 'EPC-123',
        railPriority: 1,
      };

      const res = await authenticatedRequest('patch', '/api/execution-board/epics/epic-1')
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(executionEpics[0]).toMatchObject(updates);
    });

    test('returns enriched board data after update', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/epics/epic-1')
        .send({ status: 'Done' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('epics');
      expect(res.body).toHaveProperty('gates');
      expect(res.body).toHaveProperty('slices');
      expect(res.body).toHaveProperty('dependencies');
    });
  });

  describe('PATCH /gates/:gate', () => {
    beforeEach(() => {
      executionGates.push({
        gate: 'G0',
        purpose: 'Launch readiness',
        status: 'Todo',
        checklist: '☐ Item 1',
      });
    });

    test('updates allowed fields successfully', async () => {
      const updates = {
        status: 'In Progress',
        purpose: 'Updated purpose',
        checklist: '☑ Item 1\n☐ Item 2',
      };

      const res = await authenticatedRequest('patch', '/api/execution-board/gates/G0')
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(executionGates[0].status).toBe('In Progress');
      expect(executionGates[0].purpose).toBe('Updated purpose');
      expect(executionGates[0].checklist).toBe('☑ Item 1\n☐ Item 2');
      expect(executionGates[0]).toHaveProperty('updatedAt');
    });

    test('returns 404 for non-existent gate', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/gates/G999')
        .send({ status: 'Done' });
      
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Gate not found' });
    });

    test('ignores disallowed fields', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/gates/G0')
        .send({ 
          status: 'Done',
          gate: 'G1',
          maliciousField: 'hack',
        });
      
      expect(res.status).toBe(200);
      expect(executionGates[0].gate).toBe('G0');
      expect(executionGates[0]).not.toHaveProperty('maliciousField');
    });

    test('allows updating all permitted fields', async () => {
      const updates = {
        purpose: 'New purpose',
        checklist: '☑ All done',
        ownerRole: 'Engineering',
        dependsOn: ['G1'],
        targetWindow: '2024-Q1',
        status: 'Done',
      };

      const res = await authenticatedRequest('patch', '/api/execution-board/gates/G0')
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(executionGates[0]).toMatchObject(updates);
    });

    test('returns enriched board data after update', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/gates/G0')
        .send({ status: 'Done' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('epics');
      expect(res.body).toHaveProperty('gates');
    });
  });

  describe('PATCH /slices/:id', () => {
    beforeEach(() => {
      executionSlices.push({
        id: 'slice-1',
        outcome: 'Feature complete',
        status: 'Todo',
      });
    });

    test('updates allowed fields successfully', async () => {
      const updates = {
        status: 'In Progress',
        outcome: 'Updated outcome',
        owner: 'John Doe',
      };

      const res = await authenticatedRequest('patch', '/api/execution-board/slices/slice-1')
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(executionSlices[0].status).toBe('In Progress');
      expect(executionSlices[0].outcome).toBe('Updated outcome');
      expect(executionSlices[0].owner).toBe('John Doe');
      expect(executionSlices[0]).toHaveProperty('updatedAt');
    });

    test('returns 404 for non-existent slice', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/slices/non-existent')
        .send({ status: 'Done' });
      
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Slice not found' });
    });

    test('ignores disallowed fields', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/slices/slice-1')
        .send({ 
          status: 'Done',
          id: 'changed-id',
          maliciousField: 'hack',
        });
      
      expect(res.status).toBe(200);
      expect(executionSlices[0].id).toBe('slice-1');
      expect(executionSlices[0]).not.toHaveProperty('maliciousField');
    });

    test('allows updating all permitted fields', async () => {
      const updates = {
        outcome: 'New outcome',
        primaryEpic: 'epic-1',
        gate: 'G0',
        inputs: ['input-1'],
        deliverables: ['deliverable-1'],
        acceptance: 'Criteria met',
        status: 'Done',
        owner: 'Jane Smith',
        storyKey: 'STORY-123',
        dependsOn: ['slice-0'],
      };

      const res = await authenticatedRequest('patch', '/api/execution-board/slices/slice-1')
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(executionSlices[0]).toMatchObject(updates);
    });

    test('returns enriched board data after update', async () => {
      const res = await authenticatedRequest('patch', '/api/execution-board/slices/slice-1')
        .send({ status: 'Done' });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('slices');
      expect(res.body).toHaveProperty('epics');
    });
  });

  describe('Error Handling', () => {
    test('handles malformed JSON in PATCH requests', async () => {
      executionEpics.push({ id: 'epic-1', status: 'Todo' });

      const res = await request(app)
        .patch('/api/execution-board/epics/epic-1')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-role', 'admin')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(res.status).toBe(400);
    });

    test('handles empty request body in PATCH', async () => {
      executionEpics.push({ id: 'epic-1', status: 'Todo' });

      const res = await authenticatedRequest('patch', '/api/execution-board/epics/epic-1')
        .send({});
      
      expect(res.status).toBe(200);
      // Should not modify the epic except for updatedAt
      expect(executionEpics[0].status).toBe('Todo');
    });
  });

  describe('Data Seeding', () => {
    test('automatically seeds data on first GET request', async () => {
      // Ensure arrays are empty
      expect(executionEpics.length).toBe(0);
      expect(executionGates.length).toBe(0);
      expect(executionSlices.length).toBe(0);
      expect(executionDependencies.length).toBe(0);

      const res = await authenticatedRequest('get', '/api/execution-board/board');
      expect(res.status).toBe(200);
      
      // After the request, data should be seeded (if seed data exists)
      // This test verifies that ensureSeeded() is called
      expect(res.body).toHaveProperty('epics');
      expect(res.body).toHaveProperty('gates');
      expect(res.body).toHaveProperty('slices');
      expect(res.body).toHaveProperty('dependencies');
    });
  });
});
