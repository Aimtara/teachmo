/* eslint-env jest */

async function expectDefaultExportedRouter(modulePath) {
  const imported = await import(modulePath);
  expect(imported).toHaveProperty('default');
  expect(imported.default).toBeDefined();
  expect(typeof imported.default).toBe('function');
}

describe('Backend module import compatibility', () => {
  test('can import critical route modules under Jest', async () => {
    await expectDefaultExportedRouter('../routes/partnerPortalAdmin.js');
    await expectDefaultExportedRouter('../routes/ops.js');
    await expectDefaultExportedRouter('../routes/sso.js');
  });

  test('can import backend app module under Jest', async () => {
    const appModule = await import('../app.js');

    expect(appModule).toHaveProperty('default');
    expect(appModule.default).toBeDefined();
    expect(typeof appModule.default).toBe('function');
  });
});
