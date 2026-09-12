const pool = require('../config/database');
require('dotenv').config();

/**
 * Core CareMate schema (v2) — USER / CAREGIVER / ADMIN only
 */
const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('Starting CareMate core migration...');
    await client.query('BEGIN');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password TEXT,
        name VARCHAR(255),
        profile_photo TEXT,
        role VARCHAR(50) DEFAULT 'USER' CHECK (role IN ('USER', 'CAREGIVER', 'ADMIN')),
        status VARCHAR(50) DEFAULT 'active',
        is_verified BOOLEAN DEFAULT false,
        ekyc_status BOOLEAN DEFAULT false,
        ekyc_verified_at TIMESTAMP,
        ekyc_reference_id TEXT,
        language_preference VARCHAR(10) DEFAULT 'bn',
        emergency_contact VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255),
        phone VARCHAR(20),
        otp VARCHAR(10) NOT NULL,
        type VARCHAR(50),
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        relationship VARCHAR(100),
        phone VARCHAR(20),
        blood_group VARCHAR(10),
        date_of_birth DATE,
        gender VARCHAR(20),
        photo TEXT,
        district VARCHAR(100),
        thana VARCHAR(100),
        house TEXT,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        medical_history TEXT,
        existing_conditions TEXT,
        allergies TEXT,
        current_medications TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        location_lat DECIMAL(10, 8),
        location_long DECIMAL(11, 8),
        city VARCHAR(100),
        district VARCHAR(100),
        type VARCHAR(100),
        photo TEXT,
        details TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS caregiver_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        experience_years INTEGER DEFAULT 0,
        service_areas TEXT[],
        hourly_rate DECIMAL(10, 2),
        education TEXT,
        blood_group VARCHAR(10),
        date_of_birth DATE,
        profile_photo TEXT,
        gender VARCHAR(20),
        district VARCHAR(100),
        thana VARCHAR(100),
        verification_status VARCHAR(50) DEFAULT 'PENDING',
        verification_note TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        completed_bookings INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        ekyc_status BOOLEAN DEFAULT false,
        ekyc_verified_at TIMESTAMP,
        ekyc_reference_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_number VARCHAR(50) UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id),
        family_member_id UUID REFERENCES family_members(id),
        service_type VARCHAR(50) DEFAULT 'HOSPITAL_ASSISTANCE',
        provider_type VARCHAR(50) DEFAULT 'CAREGIVER',
        provider_id UUID,
        hospital_id UUID REFERENCES hospitals(id),
        booking_date DATE,
        start_time TIME,
        end_time TIME,
        duration_hours INTEGER,
        patient_requirements TEXT,
        notes TEXT,
        service_charge DECIMAL(10, 2) DEFAULT 0,
        platform_fee DECIMAL(10, 2) DEFAULT 0,
        discount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) DEFAULT 0,
        advance_percentage DECIMAL(5, 2) DEFAULT 50,
        advance_amount DECIMAL(10, 2) DEFAULT 0,
        remaining_amount DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'PROVIDER_ASSIGNED',
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        payment_method VARCHAR(50),
        cancellation_reason TEXT,
        cancelled_by VARCHAR(50),
        cancelled_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        changed_by UUID,
        note TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        token TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, device_id, platform)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        type VARCHAR(100),
        reference_id UUID,
        reference_type VARCHAR(50),
        data JSONB DEFAULT '{}'::jsonb,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        reference_id UUID,
        reference_type VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bkash_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        id_token TEXT NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'BDT',
        merchant_invoice VARCHAR(100) NOT NULL,
        bkash_payment_id VARCHAR(100),
        trx_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'CREATED',
        payment_method VARCHAR(50) DEFAULT 'BKASH',
        create_response JSONB DEFAULT '{}'::jsonb,
        execute_response JSONB DEFAULT '{}'::jsonb,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe alters for existing DBs
    await client.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS district VARCHAR(100)');
    await client.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS thana VARCHAR(100)');
    await client.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS photo TEXT');
    await client.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS details TEXT');
    await client.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_requirements TEXT');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gender VARCHAR(20)');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS phone VARCHAR(20)');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS district VARCHAR(100)');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS thana VARCHAR(100)');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS house TEXT');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255)');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20)');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS medical_history TEXT');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS existing_conditions TEXT');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allergies TEXT');
    await client.query('ALTER TABLE family_members ADD COLUMN IF NOT EXISTS current_medications TEXT');

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_caregiver_district ON caregiver_profiles(district)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_caregiver_thana ON caregiver_profiles(thana)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_provider ON bookings(provider_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inbox_user ON inbox(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inbox_unread ON inbox(user_id, is_read)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notification_tokens_user ON notification_tokens(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bkash_tokens_user ON bkash_tokens(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_bkash_id ON payments(bkash_payment_id)');

    await client.query('COMMIT');
    console.log('Core migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
