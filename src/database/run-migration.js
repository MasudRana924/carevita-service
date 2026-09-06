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
    console.log('Caregiver profile columns added');

    console.log('Adding hospital columns...');
    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS photo TEXT');
    await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS details TEXT');
    console.log('Hospital columns added');

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
