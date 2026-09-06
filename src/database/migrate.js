const pool = require('../config/database');

const dropTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Drop tables in reverse order of dependencies
    const tables = [
      'audit_logs',
      'care_manager_assignments',
      'care_managers',
      'corporate_employees',
      'corporate_accounts',
      'subscriptions',
      'support_tickets',
      'notifications',
      'emergencies',
      'medications',
      'medical_records',
      'ambulance_bookings',
      'diagnostic_bookings',
      'diagnostic_centers',
      'diagnostic_tests',
      'medicine_orders',
      'medicines',
      'prescriptions',
      'appointments',
      'reviews',
      'wallet_transactions',
      'provider_wallets',
      'customer_wallets',
      'refunds',
      'payment_transactions',
      'payments',
      'availability_slots',
      'booking_status_history',
      'bookings',
      'services',
      'nurse_profiles',
      'caregiver_profiles',
      'provider_documents',
      'doctors',
      'hospitals',
      'addresses',
      'family_members',
      'otp_verifications',
      'users'
    ];
    
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`Dropped table: ${table}`);
    }
    
    await client.query('COMMIT');
    console.log('All tables dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) UNIQUE,
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        profile_photo TEXT,
        role VARCHAR(50) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'CAREGIVER', 'NURSE', 'ADMIN')),
        status VARCHAR(50) DEFAULT 'active',
        is_verified BOOLEAN DEFAULT false,
        language_preference VARCHAR(10) DEFAULT 'en',
        emergency_contact VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // OTP Verification table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20),
        email VARCHAR(255),
        otp VARCHAR(6) NOT NULL,
        type VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Addresses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address_line VARCHAR(255),
        city VARCHAR(100),
        district VARCHAR(100),
        division VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Family Members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS family_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        photo TEXT,
        date_of_birth DATE,
        gender VARCHAR(20),
        relationship VARCHAR(100),
        blood_group VARCHAR(10),
        address_id UUID REFERENCES addresses(id),
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

    // Hospitals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address_id UUID REFERENCES addresses(id),
        phone VARCHAR(20),
        email VARCHAR(255),
        location_lat DECIMAL(10, 8),
        location_long DECIMAL(11, 8),
        city VARCHAR(100),
        district VARCHAR(100),
        type VARCHAR(50),
        photo TEXT,
        details TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Provider Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        document_type VARCHAR(50) NOT NULL,
        document_url TEXT NOT NULL,
        verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
        verification_note TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Caregiver Profiles table
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
        verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
        verification_note TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        completed_bookings INTEGER DEFAULT 0,
        response_rate DECIMAL(5, 2) DEFAULT 0,
        cancellation_rate DECIMAL(5, 2) DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Nurse Profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS nurse_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        qualification VARCHAR(255),
        specialization VARCHAR(255),
        license_number VARCHAR(100),
        experience_years INTEGER DEFAULT 0,
        service_areas TEXT[],
        hourly_rate DECIMAL(10, 2),
        verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
        verification_note TEXT,
        rating DECIMAL(3, 2) DEFAULT 0,
        completed_bookings INTEGER DEFAULT 0,
        response_rate DECIMAL(5, 2) DEFAULT 0,
        cancellation_rate DECIMAL(5, 2) DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Doctors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        photo TEXT,
        bmdc_number VARCHAR(50),
        specialty VARCHAR(255),
        qualifications TEXT,
        experience INTEGER DEFAULT 0,
        hospital_id UUID REFERENCES hospitals(id),
        consultation_fee DECIMAL(10, 2),
        rating DECIMAL(3, 2) DEFAULT 0,
        completed_appointments INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        is_available BOOLEAN DEFAULT true,
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        base_price DECIMAL(10, 2) NOT NULL,
        duration INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('HOSPITAL_ASSISTANCE', 'NURSING')),
        provider_type VARCHAR(50) CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        provider_id UUID,
        hospital_id UUID REFERENCES hospitals(id),
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME,
        duration_hours INTEGER,
        pickup_address_id UUID REFERENCES addresses(id),
        destination_address_id UUID REFERENCES addresses(id),
        notes TEXT,
        service_charge DECIMAL(10, 2),
        platform_fee DECIMAL(10, 2),
        discount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2),
        advance_percentage INTEGER DEFAULT 50,
        advance_amount DECIMAL(10, 2),
        remaining_amount DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAYMENT_PAID', 'SEARCHING_PROVIDER', 'PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PROVIDER_ON_THE_WAY', 'PATIENT_PICKED_UP', 'SERVICE_STARTED', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED', 'CANCELLED_BY_USER', 'CANCELLED_BY_PROVIDER', 'CANCELLED_BY_ADMIN', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED')),
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        payment_method VARCHAR(50),
        cancellation_reason TEXT,
        cancelled_by UUID REFERENCES users(id),
        cancelled_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Booking Status History table
    await client.query(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        from_status VARCHAR(50),
        to_status VARCHAR(50) NOT NULL,
        changed_by UUID REFERENCES users(id),
        notes TEXT,
        location_lat DECIMAL(10, 8),
        location_long DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Availability Slots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS availability_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('CAREGIVER', 'NURSE')),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('ADVANCE', 'REMAINING', 'FULL')),
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED')),
        payment_gateway VARCHAR(50),
        gateway_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Payment Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL,
        gateway_transaction_id VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'BDT',
        status VARCHAR(50) NOT NULL,
        gateway_response JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Refunds table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
        refund_transaction_id VARCHAR(255),
        processed_by UUID REFERENCES users(id),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Customer Wallet table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance DECIMAL(10, 2) DEFAULT 0,
        credits DECIMAL(10, 2) DEFAULT 0,
        promotional_credits DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Provider Wallet table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        pending_payout DECIMAL(10, 2) DEFAULT 0,
        completed_payout DECIMAL(10, 2) DEFAULT 0,
        platform_commission DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Wallet Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID NOT NULL,
        wallet_type VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        reference_id UUID,
        balance_after DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL,
        provider_type VARCHAR(50) NOT NULL,
        overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
        punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
        politeness_rating INTEGER CHECK (politeness_rating >= 1 AND politeness_rating <= 5),
        professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
        helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
        trustworthiness_rating INTEGER CHECK (trustworthiness_rating >= 1 AND trustworthiness_rating <= 5),
        review TEXT,
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        hospital_id UUID REFERENCES hospitals(id),
        scheduled_date TIMESTAMP NOT NULL,
        appointment_type VARCHAR(50) DEFAULT 'in_person',
        status VARCHAR(50) DEFAULT 'scheduled',
        consultation_fee DECIMAL(10, 2),
        payment_status VARCHAR(50) DEFAULT 'pending',
        symptoms TEXT,
        notes TEXT,
        prescription_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Prescriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        prescription_url TEXT,
        diagnosis TEXT,
        notes TEXT,
        medicines JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Medicines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255),
        manufacturer VARCHAR(255),
        category VARCHAR(100),
        description TEXT,
        strength VARCHAR(100),
        form VARCHAR(50),
        is_prescription_required BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Medicine Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medicine_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        prescription_url TEXT,
        items JSONB NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        delivery_fee DECIMAL(10, 2) DEFAULT 0,
        discount DECIMAL(10, 2) DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        delivery_address TEXT NOT NULL,
        delivery_lat DECIMAL(10, 8),
        delivery_long DECIMAL(11, 8),
        scheduled_delivery TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        pharmacy_partner_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Diagnostic Tests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        sample_type VARCHAR(100),
        preparation_instructions TEXT,
        normal_range TEXT,
        price DECIMAL(10, 2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Diagnostic Centers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_centers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        location_lat DECIMAL(10, 8),
        location_long DECIMAL(11, 8),
        city VARCHAR(100),
        district VARCHAR(100),
        rating DECIMAL(3, 2) DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Diagnostic Bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        diagnostic_center_id UUID REFERENCES diagnostic_centers(id) ON DELETE SET NULL,
        test_id UUID NOT NULL REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
        scheduled_date TIMESTAMP NOT NULL,
        is_home_collection BOOLEAN DEFAULT false,
        collection_address TEXT,
        collection_lat DECIMAL(10, 8),
        collection_long DECIMAL(11, 8),
        status VARCHAR(50) DEFAULT 'scheduled',
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        report_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ambulance Bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ambulance_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        ambulance_type VARCHAR(50) NOT NULL,
        pickup_location TEXT NOT NULL,
        pickup_lat DECIMAL(10, 8),
        pickup_long DECIMAL(11, 8),
        destination_location TEXT,
        destination_lat DECIMAL(10, 8),
        destination_long DECIMAL(11, 8),
        patient_condition TEXT,
        emergency_contact VARCHAR(20),
        scheduled_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        driver_id UUID,
        vehicle_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Medical Records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        record_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url TEXT,
        file_type VARCHAR(50),
        record_date DATE,
        hospital_id UUID REFERENCES hospitals(id),
        doctor_id UUID REFERENCES doctors(id),
        is_confidential BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Medications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        medicine_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        frequency VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        instructions TEXT,
        is_active BOOLEAN DEFAULT true,
        reminder_enabled BOOLEAN DEFAULT true,
        reminder_times TIME[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Emergency table
    await client.query(`
      CREATE TABLE IF NOT EXISTS emergencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
        emergency_type VARCHAR(50) NOT NULL,
        location TEXT NOT NULL,
        location_lat DECIMAL(10, 8),
        location_long DECIMAL(11, 8),
        description TEXT,
        emergency_contact VARCHAR(20),
        status VARCHAR(50) DEFAULT 'active',
        assigned_provider_id UUID,
        assigned_provider_type VARCHAR(50),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        reference_id UUID,
        reference_type VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        sent_via_sms BOOLEAN DEFAULT false,
        sent_via_email BOOLEAN DEFAULT false,
        sent_via_push BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Support Tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100),
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        assigned_to UUID REFERENCES users(id),
        resolution TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_name VARCHAR(100) NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'BDT',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        features JSONB,
        auto_renew BOOLEAN DEFAULT false,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Corporate Accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS corporate_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL,
        company_address TEXT,
        contact_person VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        tax_id VARCHAR(50),
        plan_type VARCHAR(50) NOT NULL,
        monthly_allowance DECIMAL(10, 2),
        employee_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        contract_start_date DATE,
        contract_end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Corporate<Employee> table
    await client.query(`
      CREATE TABLE IF NOT EXISTS corporate_employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id VARCHAR(100),
        department VARCHAR(100),
        monthly_allowance DECIMAL(10, 2),
        used_allowance DECIMAL(10, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        joined_at DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Care Managers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS care_managers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        photo TEXT,
        phone VARCHAR(20),
        email VARCHAR(255),
        specialization TEXT,
        experience INTEGER DEFAULT 0,
        rating DECIMAL(3, 2) DEFAULT 0,
        assigned_customers INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Care Manager Assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS care_manager_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        care_manager_id UUID NOT NULL REFERENCES care_managers(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Audit Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id, provider_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_user_id ON caregiver_profiles(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_nurse_profiles_user_id ON nurse_profiles(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_availability_slots_provider_id ON availability_slots(provider_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_provider_documents_provider_id ON provider_documents(provider_id);');

    await client.query('COMMIT');
    console.log('All tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

dropTables()
  .then(() => createTables())
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
