const pool = require('../config/database');
const { applyMigrationFile } = require('./migrateRunner');

const ensureFamilyMembersSchema = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await pool.query(`
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
    )
  `);

  const alters = [
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relationship VARCHAR(100)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS phone VARCHAR(20)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS date_of_birth DATE',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gender VARCHAR(20)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS photo TEXT',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS district VARCHAR(100)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS thana VARCHAR(100)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS house TEXT',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20)',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS medical_history TEXT',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS existing_conditions TEXT',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allergies TEXT',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS current_medications TEXT',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE family_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
  ];

  for (const sql of alters) {
    await pool.query(sql);
  }

  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMP');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS suggested_provider_id UUID');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS suggestion_expires_at TIMESTAMP');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_notified_at TIMESTAMP');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_reason TEXT');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_is_emergency BOOLEAN');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_reported_at TIMESTAMP');
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_reminder_sent_at TIMESTAMP');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_live_locations (
      booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
      caregiver_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DECIMAL(10, 8) NOT NULL,
      longitude DECIMAL(11, 8) NOT NULL,
      accuracy DECIMAL(10, 2),
      heading DECIMAL(10, 2),
      speed DECIMAL(10, 2),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_booking_live_locations_active
    ON booking_live_locations (is_active)
    WHERE is_active = true
  `);

  // Columns are required by inserts. Index builds are recorded in
  // schema_migrations and skipped after the first successful boot.
  await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS book_for VARCHAR(20) NOT NULL DEFAULT 'FAMILY'`);
  await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_snapshot JSONB');
  await applyMigrationFile('add_self_booking_and_scale_indexes.sql');
  await applyMigrationFile('add_caregiver_suggestion_and_service_window.sql');
  await applyMigrationFile('add_scale_indexes.concurrent.sql');
};

module.exports = { ensureFamilyMembersSchema };
