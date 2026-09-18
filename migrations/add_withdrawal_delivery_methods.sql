-- Caregiver withdrawal delivery methods (MFS / BANK)
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'MFS';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS delivery_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE withdrawals ALTER COLUMN bkash_number DROP NOT NULL;

-- Backfill existing rows
UPDATE withdrawals
SET method = COALESCE(method, 'MFS'),
    delivery_details = CASE
      WHEN delivery_details IS NULL OR delivery_details = '{}'::jsonb THEN
        jsonb_build_object(
          'mfs_provider', 'bkash',
          'wallet_number', bkash_number,
          'account_name', ''
        )
      ELSE delivery_details
    END
WHERE bkash_number IS NOT NULL;
