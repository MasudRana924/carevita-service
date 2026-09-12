-- bKash: per-user id_token storage + payment records

CREATE TABLE IF NOT EXISTS bkash_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  id_token TEXT NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bkash_tokens_user ON bkash_tokens(user_id);

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

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_bkash_id ON payments(bkash_payment_id);
