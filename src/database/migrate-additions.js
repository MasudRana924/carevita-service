const pool = require('../config/database');

const runMigration = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Starting migration for missing tables...');

    // Provider Services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        custom_price DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(provider_id, provider_type, service_id)
      );
    `);
    console.log('Created provider_services table');

    // Provider Service Areas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_service_areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        division VARCHAR(100),
        district VARCHAR(100),
        area VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        service_radius INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created provider_service_areas table');

    // Provider Payment Accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_payment_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('BKASH', 'NAGAD', 'BANK')),
        account_number VARCHAR(255) NOT NULL,
        account_holder_name VARCHAR(255),
        bank_name VARCHAR(255),
        routing_number VARCHAR(50),
        is_default BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created provider_payment_accounts table');

    // Withdrawals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        withdrawal_number VARCHAR(50) UNIQUE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_account_id UUID REFERENCES provider_payment_accounts(id),
        status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
        rejection_reason TEXT,
        processed_by UUID REFERENCES users(id),
        processed_at TIMESTAMP,
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created withdrawals table');

    // Disputes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        dispute_number VARCHAR(50) UNIQUE NOT NULL,
        raised_by UUID NOT NULL REFERENCES users(id),
        dispute_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
        resolution TEXT,
        resolution_type VARCHAR(50),
        refund_amount DECIMAL(10, 2),
        resolved_by UUID REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created disputes table');

    // Notification Tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255),
        platform VARCHAR(50) NOT NULL CHECK (platform IN ('ANDROID', 'IOS', 'WEB')),
        token TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created notification_tokens table');

    // Fix booking service_type constraint to include HOME_CARE
    await client.query(`
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_type_check
    `);
    await client.query(`
      ALTER TABLE bookings ADD CONSTRAINT bookings_service_type_check 
      CHECK (service_type IN ('HOSPITAL_ASSISTANCE', 'HOME_CARE', 'NURSING'))
    `);
    console.log('Updated booking service_type constraint');

    // Add missing columns to bookings table
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_requirements TEXT
    `);
    console.log('Added patient_requirements column to bookings');

    // Add indexes for new tables
    await client.query('CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON provider_services(provider_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON provider_services(service_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_provider_service_areas_provider_id ON provider_service_areas(provider_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_provider_payment_accounts_provider_id ON provider_payment_accounts(provider_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_id ON withdrawals(provider_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON notification_tokens(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notification_tokens_token ON notification_tokens(token);');

    console.log('Created indexes for new tables');

    await client.query('COMMIT');
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigration();
