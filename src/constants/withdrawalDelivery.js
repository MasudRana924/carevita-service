const MFS_PROVIDERS = [
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'upay', label: 'Upay' },
  { value: 'rocket', label: 'Rocket' }
];

const DELIVERY_METHODS = {
  MFS: {
    method: 'MFS',
    label: 'Mobile Financial Service (MFS)',
    description: 'Withdraw to bKash, Nagad, Upay, or Rocket wallet',
    fields: [
      {
        key: 'account_name',
        label: 'Account Name',
        type: 'text',
        required: true,
        placeholder: 'Name registered on the wallet'
      },
      {
        key: 'wallet_number',
        label: 'Wallet Number',
        type: 'tel',
        required: true,
        placeholder: '01XXXXXXXXX'
      },
      {
        key: 'mfs_provider',
        label: 'MFS Company',
        type: 'select',
        required: true,
        options: MFS_PROVIDERS
      }
    ]
  },
  BANK: {
    method: 'BANK',
    label: 'Bank Transfer',
    description: 'Withdraw to a bank account',
    fields: [
      {
        key: 'bank_name',
        label: 'Bank Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Dutch-Bangla Bank'
      },
      {
        key: 'branch_name',
        label: 'Branch Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. Gulshan'
      },
      {
        key: 'account_number',
        label: 'Account Number',
        type: 'text',
        required: true,
        placeholder: 'Bank account number'
      },
      {
        key: 'routing_number',
        label: 'Routing Number',
        type: 'text',
        required: true,
        placeholder: 'Bank routing number'
      },
      {
        key: 'account_holder_name',
        label: 'Account Holder Name',
        type: 'text',
        required: true,
        placeholder: 'Name on the bank account'
      }
    ]
  }
};

const listDeliveryMethods = () =>
  Object.values(DELIVERY_METHODS).map(({ method, label, description }) => ({
    method,
    label,
    description
  }));

const getDeliveryMethodFields = (method) => {
  const key = String(method || '').trim().toUpperCase();
  return DELIVERY_METHODS[key] || null;
};

const validateDeliveryDetails = (method, details = {}) => {
  const config = getDeliveryMethodFields(method);
  if (!config) {
    return { ok: false, error: 'Invalid delivery method. Use MFS or BANK.' };
  }

  const normalized = {};
  for (const field of config.fields) {
    const raw = details[field.key];
    const value = raw == null ? '' : String(raw).trim();

    if (field.required && !value) {
      return { ok: false, error: `${field.key} is required for ${config.method}` };
    }

    if (field.type === 'select' && value) {
      const allowed = (field.options || []).map((o) => o.value);
      if (!allowed.includes(value.toLowerCase()) && !allowed.includes(value)) {
        const match = (field.options || []).find(
          (o) => o.value === value.toLowerCase() || o.label.toLowerCase() === value.toLowerCase()
        );
        if (!match) {
          return {
            ok: false,
            error: `${field.key} must be one of: ${allowed.join(', ')}`
          };
        }
        normalized[field.key] = match.value;
        continue;
      }
      normalized[field.key] = value.toLowerCase();
      continue;
    }

    if (value) normalized[field.key] = value;
  }

  return { ok: true, method: config.method, deliveryDetails: normalized };
};

module.exports = {
  MFS_PROVIDERS,
  DELIVERY_METHODS,
  listDeliveryMethods,
  getDeliveryMethodFields,
  validateDeliveryDetails
};
