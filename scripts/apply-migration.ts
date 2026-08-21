import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const migrationPath = join(__dirname, "../supabase/migrations/001_create_donations.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("Applying migration to Supabase...");

    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      console.error("Error applying migration:", error);
      process.exit(1);
    }

    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

applyMigration();
