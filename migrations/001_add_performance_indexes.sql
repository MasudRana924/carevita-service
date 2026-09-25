-- Performance Optimization Indexes
-- Migration: 001_add_performance_indexes
-- Description: Add indexes for frequently queried columns to improve performance

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON bookings(updated_at);
CREATE INDEX IF NOT EXISTS idx_bookings_offer_expires ON bookings(offer_expires_at) WHERE offer_expires_at IS NOT NULL;

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_ekyc_status ON users(ekyc_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Caregiver profiles table indexes
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_user_id ON caregiver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_district ON caregiver_profiles(district);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_thana ON caregiver_profiles(thana);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_provider_type ON caregiver_profiles(provider_type);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_verification_status ON caregiver_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_is_available ON caregiver_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_rating ON caregiver_profiles(rating);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_service_areas ON caregiver_profiles USING GIN(service_areas);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_district_thana ON caregiver_profiles(district, thana);

-- Family members table indexes
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_district ON family_members(district);
CREATE INDEX IF NOT EXISTS idx_family_members_thana ON family_members(thana);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON messages(sender_role);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- Reviews table indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_caregiver_profile_id ON reviews(caregiver_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Disputes table indexes
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Wallet table indexes
CREATE INDEX IF NOT EXISTS idx_wallet_provider_id ON wallet(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_balance ON wallet(balance);

-- Withdrawals table indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_id ON withdrawals(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- Notification tokens table indexes
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_device_id ON notification_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_is_active ON notification_tokens(is_active);

-- Inbox table indexes
CREATE INDEX IF NOT EXISTS idx_inbox_user_id ON inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_is_read ON inbox(is_read);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox(created_at);

-- Booking status history table indexes
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_created_at ON booking_status_history(created_at);

-- Booking rejections table indexes
CREATE INDEX IF NOT EXISTS idx_booking_rejections_booking_id ON booking_rejections(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_rejections_provider_id ON booking_rejections(provider_id);

-- Availability table indexes
CREATE INDEX IF NOT EXISTS idx_availability_caregiver_profile_id ON availability(caregiver_profile_id);
CREATE INDEX IF NOT EXISTS idx_availability_day_of_week ON availability(day_of_week);

-- Safety incidents table indexes
CREATE INDEX IF NOT EXISTS idx_safety_incidents_booking_id ON safety_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);

-- Hospitals table indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_district ON hospitals(district);
CREATE INDEX IF NOT EXISTS idx_hospitals_thana ON hospitals(thana);
CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name);

-- Payment accounts table indexes
CREATE INDEX IF NOT EXISTS idx_payment_accounts_provider_id ON payment_accounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_account_type ON payment_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_is_default ON payment_accounts(is_default);

-- Comment for documentation
COMMENT ON MIGRATION IS 'Added performance indexes for frequently queried columns';
