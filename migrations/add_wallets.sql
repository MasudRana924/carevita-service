-- Wallets: USER / CAREGIVER / PLATFORM
-- On successful payment: 5% → PLATFORM, 95% → CAREGIVER

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('USER', 'CAREGIVER', 'PLATFORM')),
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT wallets_owner_user_check CHECK (
    (owner_type = 'PLATFORM' AND user_id IS NULL)
    OR (owner_type IN ('USER', 'CAREGIVER') AND user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallets_platform
  ON wallets (owner_type)
  WHERE owner_type = 'PLATFORM';

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  balance_after DECIMAL(12, 2) NOT NULL DEFAULT 0,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_booking ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_payment ON wallet_transactions(payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_payment_category
  ON wallet_transactions (payment_id, category)
  WHERE payment_id IS NOT NULL;

-- Seed platform wallet if missing
INSERT INTO wallets (owner_type, balance)
SELECT 'PLATFORM', 0
WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE owner_type = 'PLATFORM');
