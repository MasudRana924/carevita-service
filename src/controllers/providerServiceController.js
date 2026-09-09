const { createProviderService, getProviderServices, updateProviderService, deleteProviderService, getServicesByProviderId } = require('../models/ProviderService');
const { getCaregiverProfileByUserId: findCaregiverProfile } = require('../models/CaregiverProfile');
const { getNurseProfileByUserId: findNurseProfile } = require('../models/NurseProfile');

/**
 * Add service to provider's offered services
 */
exports.addService = async (req, res) => {
  try {
    const { service_id, custom_price } = req.body;
    const userId = req.user.id;
    const providerType = req.user.role === 'CAREGIVER' ? 'CAREGIVER' : 'NURSE';

    // Get provider profile
    let providerProfile;
    if (providerType === 'CAREGIVER') {
      providerProfile = await findCaregiverProfile(userId);
    } else {
      providerProfile = await findNurseProfile(userId);
    }

    if (!providerProfile) {
      return res.notFound('Provider profile not found');
    }

    const providerService = await createProviderService({
      provider_id: providerProfile.id,
      provider_type: providerType,
      service_id,
      custom_price
    });

    res.success(providerService, 'Service added successfully');
  } catch (error) {
    console.error('Add service error:', error);
    res.serverError('Failed to add service');
  }
};

/**
 * Get provider's services
 */
exports.getServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const providerType = req.user.role === 'CAREGIVER' ? 'CAREGIVER' : 'NURSE';

    // Get provider profile
    let providerProfile;
    if (providerType === 'CAREGIVER') {
      providerProfile = await findCaregiverProfile(userId);
    } else {
      providerProfile = await findNurseProfile(userId);
    }

    if (!providerProfile) {
      return res.notFound('Provider profile not found');
    }

    const services = await getProviderServices(providerProfile.id, providerType);
    res.success(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.serverError('Failed to get services');
  }
};

/**
 * Update provider service
 */
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_price, is_active } = req.body;

    const providerService = await updateProviderService(id, { custom_price, is_active });
    if (!providerService) {
      return res.notFound('Provider service not found');
    }

    res.success(providerService, 'Service updated successfully');
  } catch (error) {
    console.error('Update service error:', error);
    res.serverError('Failed to update service');
  }
};

/**
 * Remove provider service
 */
exports.removeService = async (req, res) => {
  try {
    const { id } = req.params;

    const providerService = await deleteProviderService(id);
    if (!providerService) {
      return res.notFound('Provider service not found');
    }

    res.success(providerService, 'Service removed successfully');
  } catch (error) {
    console.error('Remove service error:', error);
    res.serverError('Failed to remove service');
  }
};
