-- CareMate v2: drop unused tables from old features (nurse, medicine, wallet, etc.)
-- Keeps only: users, otp_verifications, family_members, hospitals, caregiver_profiles,
-- bookings, booking_status_history, notification_tokens, inbox, notifications

DROP TABLE IF EXISTS medicine_order_items CASCADE;
DROP TABLE IF EXISTS medicine_orders CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS pharmacy_orders CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;

DROP TABLE IF EXISTS nurse_profiles CASCADE;
DROP TABLE IF EXISTS nurses CASCADE;

DROP TABLE IF EXISTS doctor_availability CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;

DROP TABLE IF EXISTS diagnostic_bookings CASCADE;
DROP TABLE IF EXISTS diagnostic_center_tests CASCADE;
DROP TABLE IF EXISTS diagnostic_centers CASCADE;
DROP TABLE IF EXISTS diagnostic_tests CASCADE;

DROP TABLE IF EXISTS ambulance_bookings CASCADE;
DROP TABLE IF EXISTS ambulances CASCADE;

DROP TABLE IF EXISTS helping_hand_bookings CASCADE;
DROP TABLE IF EXISTS helping_hands CASCADE;

DROP TABLE IF EXISTS care_manager_assignments CASCADE;
DROP TABLE IF EXISTS care_managers CASCADE;

DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS medication_reminders CASCADE;

DROP TABLE IF EXISTS emergencies CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;

DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;

DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;

DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS customer_wallets CASCADE;
DROP TABLE IF EXISTS provider_wallets CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS provider_payment_accounts CASCADE;

DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

DROP TABLE IF EXISTS provider_services CASCADE;
DROP TABLE IF EXISTS provider_service_areas CASCADE;
DROP TABLE IF EXISTS provider_documents CASCADE;
DROP TABLE IF EXISTS availability_slots CASCADE;
DROP TABLE IF EXISTS services CASCADE;

DROP TABLE IF EXISTS corporate_users CASCADE;
DROP TABLE IF EXISTS corporates CASCADE;

DROP TABLE IF EXISTS ekyc_verifications CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS booking_status_timeline CASCADE;
DROP TABLE IF EXISTS corporate_accounts CASCADE;
DROP TABLE IF EXISTS corporate_employees CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS refunds CASCADE;

-- Optional leftover columns on bookings (safe if missing)
ALTER TABLE bookings DROP COLUMN IF EXISTS pickup_address_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS destination_address_id;
ALTER TABLE family_members DROP COLUMN IF EXISTS address_id;
