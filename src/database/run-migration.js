const pool = require('../config/database');

const runMigration = async () => {
  try {
    console.log('Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('Connected successfully');

    console.log('Adding caregiver profile columns...');
    await pool.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS education TEXT');
    await pool.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10)');
    await pool.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE');
    await pool.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS profile_photo TEXT');
    await pool.query('ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20)');
    console.log('Caregiver profile columns added');

    console.log('Adding hospital columns...');
    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS address TEXT');
    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS photo TEXT');
    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS details TEXT');
    console.log('Hospital columns added');

    console.log('Adding booking columns...');
    await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_requirements TEXT');
    console.log('Booking columns added');

    console.log('Updating service_type check constraint...');
    await pool.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check');
    await pool.query("ALTER TABLE bookings ADD CONSTRAINT bookings_service_type_check CHECK (service_type IN ('HOSPITAL_ASSISTANCE', 'HOME_CARE', 'NURSING'))");
    console.log('Service type check constraint updated');

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
