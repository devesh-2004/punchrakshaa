/**
 * Seed / register a new ADMIN user in the database.
 *
 * Admin access in this project (see lib/utils/adminAuth.ts -> requireAdmin) is granted to:
 *   1. the env-var admin  (NEXT_PUBLIC_ADMIN_EMAIL / NEXT_PUBLIC_ADMIN_PASSWORD), and
 *   2. ANY users row whose `role = 'admin'`.
 *
 * The `users` table has no password column — customers AND admins authenticate via
 * phone OTP (MSG91). So "registering an admin" = creating/promoting a users row to
 * role='admin'. That person then signs in through the normal phone-OTP login with the
 * phone below, and requireAdmin() grants them admin API/page access because of the role.
 *
 * Idempotent: re-running with the same phone updates (promotes) the existing row.
 *
 * Run (args take precedence over env vars):
 *   npx tsx scripts/seed-admin.ts --phone 919999999999 --email admin@punchraksha.com --name "Site Admin"
 *
 * Or via env vars:
 *   SEED_ADMIN_PHONE=919999999999 SEED_ADMIN_EMAIL=admin@punchraksha.com \
 *   SEED_ADMIN_NAME="Site Admin" npx tsx scripts/seed-admin.ts
 *
 * Phone format: digits only, with country code, no '+' (e.g. 919999999999), matching
 * how the OTP flow upserts users by phone.
 */
import * as dotenv from "dotenv";

// Load env BEFORE importing the db layer (the pg Pool is a singleton that reads
// DATABASE_URL on first import — same ordering the other seed scripts rely on).
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

/** Minimal `--flag value` parser (no external deps). */
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}

async function main() {
  const phone = (arg("phone") || process.env.SEED_ADMIN_PHONE || "").trim();
  const email = (arg("email") || process.env.SEED_ADMIN_EMAIL || "").trim();
  const name = (arg("name") || process.env.SEED_ADMIN_NAME || "Admin").trim();

  if (!phone) {
    console.error(
      "❌ Missing phone. Provide --phone <number> or set SEED_ADMIN_PHONE.\n" +
        '   Example: npx tsx scripts/seed-admin.ts --phone 919999999999 --email admin@punchraksha.com --name "Site Admin"',
    );
    process.exit(1);
  }
  if (!/^\d{10,15}$/.test(phone)) {
    console.error(`❌ Invalid phone "${phone}". Use digits only with country code, no '+' (e.g. 919999999999).`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in .env / .env.local");
    process.exit(1);
  }

  const { one } = await import("@/lib/db/postgres");

  // Upsert by phone and force role='admin'. COALESCE keeps an existing name/email
  // when this run leaves them blank, so re-promoting doesn't wipe details.
  const row = await one(
    `INSERT INTO users (phone, name, email, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (phone) DO UPDATE
       SET role = 'admin',
           name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name),
           email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
           updated_at = now()
     RETURNING id, name, email, phone, role, created_at`,
    [phone, name, email],
  );

  console.log("✅ Admin ready:");
  console.log(`   id:    ${row!.id}`);
  console.log(`   name:  ${row!.name}`);
  console.log(`   email: ${row!.email || "(none)"}`);
  console.log(`   phone: ${row!.phone}`);
  console.log(`   role:  ${row!.role}`);
  console.log(
    "\n🔐 Login: sign in via the phone-OTP flow with the number above. " +
      "requireAdmin() then grants admin access because role='admin'.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Admin seed failed:", err);
  process.exit(1);
});
