-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  reference_id TEXT UNIQUE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('manual_pix', 'mercosulpay_pix')),
  status TEXT NOT NULL CHECK (status IN ('awaiting_manual_payment', 'pending', 'completed', 'failed', 'refunded', 'expired')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  pix_key TEXT,
  mercosulpay_charge_id TEXT UNIQUE,
  mercosulpay_transaction_id TEXT UNIQUE,
  fee_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  donor_name TEXT,
  donor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  delivery_id TEXT UNIQUE NOT NULL,
  event TEXT NOT NULL,
  transaction_id TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_reference_id ON donations(reference_id);
CREATE INDEX IF NOT EXISTS idx_donations_public_id ON donations(public_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivery_id ON webhook_deliveries(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_transaction_id ON webhook_deliveries(transaction_id);

-- Enable Row Level Security
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies: deny all access from client
CREATE POLICY "No direct access to donations" ON donations FOR ALL USING (false);
CREATE POLICY "No direct access to webhook_deliveries" ON webhook_deliveries FOR ALL USING (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
