describe('jwt config defaults', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('defaults access token expiry to 15m in non-production', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_EXPIRE;
    process.env.JWT_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';

    const jwtConfig = require('../../src/config/jwt');
    expect(jwtConfig.JWT_EXPIRE).toBe('15m');
    expect(jwtConfig.JWT_REFRESH_EXPIRE).toBe('30d');

    const token = jwtConfig.generateToken({ userId: 'u1', role: 'USER' });
    const decoded = jwtConfig.verifyToken(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.role).toBe('USER');
  });

  test('getRefreshExpiresAt is in the future', () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-access';
    process.env.JWT_REFRESH_SECRET = 'test-refresh';
    process.env.JWT_REFRESH_EXPIRE = '30d';

    const { getRefreshExpiresAt } = require('../../src/config/jwt');
    const expires = getRefreshExpiresAt();
    expect(expires.getTime()).toBeGreaterThan(Date.now() + 24 * 3600 * 1000);
  });
});
