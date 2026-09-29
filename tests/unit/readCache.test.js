const {
  getOrSet,
  bumpNamespace,
  setRedisClientForTests,
  resetCacheForTests
} = require('../../src/services/readCache');

describe('readCache', () => {
  afterEach(() => {
    resetCacheForTests();
  });

  test('reads the database when Redis is not configured', async () => {
    const loader = jest.fn().mockResolvedValue({ ok: true });
    await expect(getOrSet('k', 30, loader)).resolves.toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test('returns a Redis hit without calling the database', async () => {
    const client = {
      get: jest.fn().mockResolvedValue({ cached: 1 }),
      set: jest.fn(),
      incr: jest.fn()
    };
    setRedisClientForTests(client);
    const loader = jest.fn();

    await expect(getOrSet('caregivers:search', 45, loader, { namespace: 'caregivers' }))
      .resolves.toEqual({ cached: 1 });
    expect(loader).not.toHaveBeenCalled();
  });

  test('falls back to the database when Redis throws', async () => {
    const client = {
      get: jest.fn().mockRejectedValue(new Error('quota exceeded')),
      set: jest.fn(),
      incr: jest.fn()
    };
    setRedisClientForTests(client);
    const loader = jest.fn().mockResolvedValue([{ id: 'db' }]);

    await expect(getOrSet('hospitals:list', 60, loader)).resolves.toEqual([{ id: 'db' }]);
    expect(loader).toHaveBeenCalledTimes(1);

    await getOrSet('hospitals:list', 60, loader);
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test('stores a miss and ignores a failed write', async () => {
    const client = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockRejectedValue(new Error('timeout')),
      incr: jest.fn()
    };
    setRedisClientForTests(client);
    const loader = jest.fn().mockResolvedValue({ items: [] });

    await expect(getOrSet('k', 30, loader)).resolves.toEqual({ items: [] });
    expect(client.set).toHaveBeenCalled();
  });

  test('reuses the namespace version for one second', async () => {
    const client = {
      get: jest.fn()
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce({ item: 1 })
        .mockResolvedValueOnce({ item: 2 }),
      set: jest.fn(),
      incr: jest.fn()
    };
    setRedisClientForTests(client);
    const loader = jest.fn();

    await getOrSet('a', 30, loader, { namespace: 'caregivers' });
    await getOrSet('b', 30, loader, { namespace: 'caregivers' });

    expect(client.get).toHaveBeenCalledTimes(3);
    expect(client.get).toHaveBeenNthCalledWith(1, 'ver:caregivers');
    expect(client.get).toHaveBeenNthCalledWith(2, 'a:v2');
    expect(client.get).toHaveBeenNthCalledWith(3, 'b:v2');
    expect(loader).not.toHaveBeenCalled();
  });

  test('stores a stripped copy and returns the database row on a miss', async () => {
    const client = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn()
    };
    setRedisClientForTests(client);
    const loader = jest.fn().mockResolvedValue({ email: 'a@b.c', name: 'A' });

    await expect(getOrSet('p', 30, loader, {
      serialize: (row) => {
        const copy = { ...row };
        delete copy.email;
        return copy;
      }
    })).resolves.toEqual({ email: 'a@b.c', name: 'A' });

    expect(client.set).toHaveBeenCalledWith('p', { name: 'A' }, { ex: 30 });
  });

  test('bump failure does not throw', async () => {
    const client = {
      get: jest.fn(),
      set: jest.fn(),
      incr: jest.fn().mockRejectedValue(new Error('down'))
    };
    setRedisClientForTests(client);
    await expect(bumpNamespace('caregivers')).resolves.toBeUndefined();
  });
});
