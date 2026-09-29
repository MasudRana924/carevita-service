/**
 * Short-lived caches for read-heavy catalog data.
 * Booking, payment, wallet, and auth paths do not use this.
 */

const { getOrSet, bumpNamespace } = require('./readCache');

const CAREGIVERS = 'caregivers';
const HOSPITALS = 'hospitals';
const POLICIES = 'privacy-policies';

const stableKey = (prefix, payload) => {
  const normalized = {};
  Object.keys(payload || {}).sort().forEach((key) => {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== '') {
      normalized[key] = value;
    }
  });
  return `${prefix}:${JSON.stringify(normalized)}`;
};

const cachedCaregiverSearch = (filters, loader) =>
  getOrSet(stableKey('caregivers:search', filters), 45, loader, { namespace: CAREGIVERS });

const cachedCaregiverPublicProfile = (id, loader) =>
  getOrSet(`caregivers:public:${id}`, 60, loader, { namespace: CAREGIVERS, cacheNull: false });

const cachedPublicAvailability = (profileId, loader) =>
  getOrSet(`availability:${profileId}`, 45, loader, { namespace: CAREGIVERS });

const cachedHospitalList = (filters, loader) =>
  getOrSet(stableKey('hospitals:list', filters), 120, loader, { namespace: HOSPITALS });

const cachedHospital = (id, loader) =>
  getOrSet(`hospitals:one:${id}`, 120, loader, { namespace: HOSPITALS, cacheNull: false });

const cachedPrivacyPolicy = (audience, loader) =>
  getOrSet(`privacy:${audience}`, 300, loader, {
    namespace: POLICIES,
    cacheNull: false
  });

const cachedPrivacyList = (loader) =>
  getOrSet('privacy:list', 300, loader, { namespace: POLICIES });

const cachedDashboard = (loader) =>
  getOrSet('admin:dashboard:stats', 30, loader);

const invalidateCaregiverCatalog = () => bumpNamespace(CAREGIVERS);
const invalidateHospitals = () => bumpNamespace(HOSPITALS);
const invalidatePrivacyPolicies = () => bumpNamespace(POLICIES);

module.exports = {
  cachedCaregiverSearch,
  cachedCaregiverPublicProfile,
  cachedPublicAvailability,
  cachedHospitalList,
  cachedHospital,
  cachedPrivacyPolicy,
  cachedPrivacyList,
  cachedDashboard,
  invalidateCaregiverCatalog,
  invalidateHospitals,
  invalidatePrivacyPolicies
};
