const { PLATFORM_FEE_RATE } = require('../config/platform');

const BASE_PRICE = {
  HOSPITAL_ASSISTANCE: 300,
  HOME_CARE: 500
};

const DEFAULT_HOURLY_RATE = 250;
const DEFAULT_ADVANCE_PERCENTAGE = 50;

/**
 * Central booking price calculator (platform fee + optional advance split).
 */
const calculateBookingPrice = ({
  serviceType = 'HOSPITAL_ASSISTANCE',
  durationHours = 1,
  hourlyRate = DEFAULT_HOURLY_RATE,
  advancePercentage = DEFAULT_ADVANCE_PERCENTAGE
} = {}) => {
  const hours = Math.max(1, parseInt(durationHours, 10) || 1);
  const rate = Number(hourlyRate) > 0 ? Number(hourlyRate) : DEFAULT_HOURLY_RATE;
  const basePrice = BASE_PRICE[serviceType] ?? BASE_PRICE.HOME_CARE;
  const service_charge = Number((basePrice + rate * hours).toFixed(2));
  const platform_fee = Number((service_charge * PLATFORM_FEE_RATE).toFixed(2));
  const total_amount = Number((service_charge + platform_fee).toFixed(2));
  const advance_percentage = Number(advancePercentage) || DEFAULT_ADVANCE_PERCENTAGE;
  const advance_amount = Number((total_amount * (advance_percentage / 100)).toFixed(2));
  const remaining_amount = Number((total_amount - advance_amount).toFixed(2));

  return {
    basePrice,
    hourlyRate: rate,
    durationHours: hours,
    service_charge,
    platform_fee,
    total_amount,
    advance_percentage,
    advance_amount,
    remaining_amount
  };
};

module.exports = {
  BASE_PRICE,
  DEFAULT_HOURLY_RATE,
  DEFAULT_ADVANCE_PERCENTAGE,
  calculateBookingPrice
};
