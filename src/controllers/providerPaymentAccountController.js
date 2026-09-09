const { createPaymentAccount, getPaymentAccounts, updatePaymentAccount, deletePaymentAccount, setDefaultAccount, maskAccountNumber } = require('../models/ProviderPaymentAccount');
const { getCaregiverProfileByUserId: findCaregiverProfile } = require('../models/CaregiverProfile');
const { getNurseProfileByUserId: findNurseProfile } = require('../models/NurseProfile');

/**
 * Add payment account
 */
exports.addPaymentAccount = async (req, res) => {
  try {
    const { account_type, account_number, account_holder_name, bank_name, routing_number } = req.body;
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

    const paymentAccount = await createPaymentAccount({
      provider_id: providerProfile.id,
      provider_type: providerType,
      account_type,
      account_number,
      account_holder_name,
      bank_name,
      routing_number
    });

    // Mask account number in response
    const response = {
      ...paymentAccount,
      account_number: maskAccountNumber(paymentAccount.account_number)
    };

    res.success(response, 'Payment account added successfully');
  } catch (error) {
    console.error('Add payment account error:', error);
    res.serverError('Failed to add payment account');
  }
};

/**
 * Get provider's payment accounts
 */
exports.getPaymentAccounts = async (req, res) => {
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

    const paymentAccounts = await getPaymentAccounts(providerProfile.id, providerType);

    // Mask account numbers in response
    const maskedAccounts = paymentAccounts.map(account => ({
      ...account,
      account_number: maskAccountNumber(account.account_number)
    }));

    res.success(maskedAccounts);
  } catch (error) {
    console.error('Get payment accounts error:', error);
    res.serverError('Failed to get payment accounts');
  }
};

/**
 * Update payment account
 */
exports.updatePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { account_holder_name, bank_name, routing_number, is_default } = req.body;

    const paymentAccount = await updatePaymentAccount(id, {
      account_holder_name,
      bank_name,
      routing_number,
      is_default
    });

    if (!paymentAccount) {
      return res.notFound('Payment account not found');
    }

    // If setting as default, update other accounts
    if (is_default) {
      const userId = req.user.id;
      const providerType = req.user.role === 'CAREGIVER' ? 'CAREGIVER' : 'NURSE';
      
      let providerProfile;
      if (providerType === 'CAREGIVER') {
        providerProfile = await findCaregiverProfile(userId);
      } else {
        providerProfile = await findNurseProfile(userId);
      }

      if (providerProfile) {
        await setDefaultAccount(id, providerProfile.id, providerType);
      }
    }

    const response = {
      ...paymentAccount,
      account_number: maskAccountNumber(paymentAccount.account_number)
    };

    res.success(response, 'Payment account updated successfully');
  } catch (error) {
    console.error('Update payment account error:', error);
    res.serverError('Failed to update payment account');
  }
};

/**
 * Delete payment account
 */
exports.deletePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const paymentAccount = await deletePaymentAccount(id);
    if (!paymentAccount) {
      return res.notFound('Payment account not found');
    }

    res.success(paymentAccount, 'Payment account deleted successfully');
  } catch (error) {
    console.error('Delete payment account error:', error);
    res.serverError('Failed to delete payment account');
  }
};
