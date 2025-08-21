import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../index.js';

// Verify that the root API endpoint returns the welcome message
// and the server can start and stop without errors.
test('GET /api returns welcome message', async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();

  const res = await fetch(`http://localhost:${port}/api`);
  const body = await res.json();
  assert.deepStrictEqual(body, { message: 'Welcome to the Teachmo API' });

  await new Promise(resolve => server.close(resolve));
});
