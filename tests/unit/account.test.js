jest.mock('../../src/models/User', () => ({ findById: jest.fn(), updateUser: jest.fn() }));
jest.mock('../../src/models/CaregiverProfile', () => ({
  getCaregiverProfileByUserId: jest.fn(),
  updateCaregiverProfile: jest.fn()
}));
jest.mock('../../src/services/catalogCache', () => ({ invalidateCaregiverCatalog: jest.fn() }));

const { findById, updateUser } = require('../../src/models/User');
const { getCaregiverProfileByUserId, updateCaregiverProfile } = require('../../src/models/CaregiverProfile');
const { invalidateCaregiverCatalog } = require('../../src/services/catalogCache');
const account = require('../../src/services/accountService');

const baseUser = (overrides = {}) => ({
  id: 'u-1',
  role: 'USER',
  name: 'Karim',
  email: 'karim@example.com',
  phone: '01700000000',
  profile_photo: null,
  gender: null,
  date_of_birth: null,
  ...overrides
});

beforeEach(() => jest.clearAllMocks());

describe('accountService.parseAccountUpdate', () => {
  it('keeps only provided, valid fields and normalises gender', () => {
    expect(account.parseAccountUpdate({ name: '  Karim  ', gender: 'Male', date_of_birth: '1990-05-20' }))
      .toEqual({ name: 'Karim', gender: 'male', date_of_birth: '1990-05-20' });
  });

  it('ignores email, phone and profile_photo', () => {
    expect(account.parseAccountUpdate({ email: 'x@y.z', phone: '017', profile_photo: 'http://x' })).toEqual({});
  });

  it('rejects an empty name, unknown gender and bad dates', () => {
    expect(() => account.parseAccountUpdate({ name: '   ' })).toThrow('Name cannot be empty');
    expect(() => account.parseAccountUpdate({ gender: 'robot' })).toThrow(/gender must be one of/);
    expect(() => account.parseAccountUpdate({ date_of_birth: '1990-02-30' })).toThrow(/YYYY-MM-DD/);
    expect(() => account.parseDateOfBirth('2030-01-01', new Date('2026-10-01T00:00:00Z'))).toThrow(/future/);
  });
});

describe('accountService.updatePhoto', () => {
  it('requires a file', async () => {
    await expect(account.updatePhoto('u-1', undefined)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('updates a USER photo without touching caregiver profiles', async () => {
    findById.mockResolvedValue(baseUser());
    updateUser.mockResolvedValue(baseUser({ profile_photo: 'https://cdn/a.jpg' }));

    const result = await account.updatePhoto('u-1', { path: 'https://cdn/a.jpg' });
    expect(result.profile_photo).toBe('https://cdn/a.jpg');
    expect(getCaregiverProfileByUserId).not.toHaveBeenCalled();
  });

  it('mirrors a CAREGIVER photo onto caregiver_profiles and clears the catalog cache', async () => {
    findById.mockResolvedValue(baseUser({ role: 'CAREGIVER' }));
    updateUser.mockResolvedValue(baseUser({ role: 'CAREGIVER', profile_photo: 'https://cdn/c.jpg' }));
    getCaregiverProfileByUserId.mockResolvedValue({ id: 'cp-1' });
    updateCaregiverProfile.mockResolvedValue({ id: 'cp-1', profile_photo: 'https://cdn/c.jpg' });

    const result = await account.updatePhoto('u-1', { path: 'https://cdn/c.jpg' });
    expect(updateCaregiverProfile).toHaveBeenCalledWith('cp-1', { profile_photo: 'https://cdn/c.jpg' });
    expect(invalidateCaregiverCatalog).toHaveBeenCalled();
    expect(result.caregiver_profile_id).toBe('cp-1');
  });
});

describe('accountService.updateAccount', () => {
  it('mirrors gender and date_of_birth for caregivers but not name', async () => {
    findById.mockResolvedValue(baseUser({ role: 'CAREGIVER' }));
    updateUser.mockResolvedValue(baseUser({ role: 'CAREGIVER', name: 'Rahim', gender: 'male' }));
    getCaregiverProfileByUserId.mockResolvedValue({ id: 'cp-1' });
    updateCaregiverProfile.mockResolvedValue({ id: 'cp-1' });

    await account.updateAccount('u-1', { name: 'Rahim', gender: 'male' });
    expect(updateUser).toHaveBeenCalledWith('u-1', { name: 'Rahim', gender: 'male' });
    expect(updateCaregiverProfile).toHaveBeenCalledWith('cp-1', { gender: 'male' });
  });

  it('falls back to caregiver profile values for legacy accounts', async () => {
    findById.mockResolvedValue(baseUser({ role: 'CAREGIVER' }));
    getCaregiverProfileByUserId.mockResolvedValue({ id: 'cp-1', profile_photo: 'https://cdn/old.jpg', gender: 'female' });

    const result = await account.getAccount('u-1');
    expect(result).toMatchObject({ profile_photo: 'https://cdn/old.jpg', gender: 'female', caregiver_profile_id: 'cp-1' });
  });
});
