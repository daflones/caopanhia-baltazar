const fs = require('fs');
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// SQL statements split for execution
const statements = [
  `CREATE TABLE IF NOT EXISTS donations (
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
  )`,
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    delivery_id TEXT UNIQUE NOT NULL,
    event TEXT NOT NULL,
    transaction_id TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_donations_reference_id ON donations(reference_id)`,
  `CREATE INDEX IF NOT EXISTS idx_donations_public_id ON donations(public_id)`,
  `CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)`,
  `CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivery_id ON webhook_deliveries(delivery_id)`,
  `CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_transaction_id ON webhook_deliveries(transaction_id)`,
  `ALTER TABLE donations ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "No direct access to donations" ON donations`,
  `CREATE POLICY "No direct access to donations" ON donations FOR ALL USING (false)`,
  `DROP POLICY IF EXISTS "No direct access to webhook_deliveries" ON webhook_deliveries`,
  `CREATE POLICY "No direct access to webhook_deliveries" ON webhook_deliveries FOR ALL USING (false)`,
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS update_donations_updated_at ON donations`,
  `CREATE TRIGGER update_donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()`
];

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(JSON.stringify({ sql }))
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

async function applyMigration() {
  console.log('Applying migration to Supabase...');
  
  for (let i = 0; i < statements.length; i++) {
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await executeSQL(statements[i]);
      console.log(`✓ Statement ${i + 1} completed`);
    } catch (error) {
      console.error(`✗ Statement ${i + 1} failed:`, error.message);
      // Continue with other statements
    }
  }
  
  console.log('Migration process completed!');
  console.log('Please verify tables in Supabase dashboard.');
}

applyMigration().catch(console.error);
