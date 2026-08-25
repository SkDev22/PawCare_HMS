// One-off provisioning script for onboarding a new hospital (ADR-06 / §03 of
// the SaaS blueprint): creates a Clinic tenant plus its first ADMIN StaffUser
// in a single run. No admin UI for this exists yet — this is the fastest safe
// way to onboard a client until one is built.
//
// Usage:
//   pnpm --filter server clinic:create -- \
//     --name "City Paws Veterinary" \
//     --email "admin@citypaws.com" \
//     --password "TempPass123!" \
//     --firstName "Jane" \
//     --lastName "Doe" \
//     --days 30 \
//     --clinicEmail "contact@citypaws.com" \
//     --phone "+1-555-0100" \
//     --address "123 Vet Lane, Springfield"
//
// --days sets the trial length (default 30). Omit it (or pass --plan BASIC /
// PRO / ENTERPRISE instead of relying on the default) to create a non-trial
// clinic that never locks.
//
// --clinicEmail / --phone / --address are optional and populate the clinic's
// own contact fields (shown/edited later in Settings) — distinct from
// --email, which is only the first admin's login.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

const VALID_PLANS = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'] as const;
type Plan = (typeof VALID_PLANS)[number];

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const token = raw[i];
    if (token?.startsWith('--')) {
      const key = token.slice(2);
      const value = raw[i + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`Missing value for --${key}`);
      }
      args[key] = value;
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const required = ['name', 'email', 'password', 'firstName', 'lastName'];
  const missing = required.filter((k) => !args[k]);
  if (missing.length > 0) {
    console.error(`❌ Missing required argument(s): ${missing.map((k) => `--${k}`).join(', ')}`);
    process.exit(1);
  }

  const plan = (args['plan']?.toUpperCase() ?? 'TRIAL') as Plan;
  if (!VALID_PLANS.includes(plan)) {
    console.error(`❌ --plan must be one of: ${VALID_PLANS.join(', ')}`);
    process.exit(1);
  }

  const days = args['days'] ? Number(args['days']) : 30;
  const trial_ends_at =
    plan === 'TRIAL' ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

  const existingAdmin = await prisma.staffUser.findUnique({ where: { email: args['email']! } });
  if (existingAdmin) {
    console.error(`❌ A staff account already exists with email ${args['email']}`);
    process.exit(1);
  }

  const clinic = await prisma.clinic.create({
    data: {
      name: args['name']!,
      plan,
      ...(trial_ends_at ? { trial_ends_at } : {}),
      ...(args['clinicEmail'] ? { email: args['clinicEmail'] } : {}),
      ...(args['phone'] ? { phone: args['phone'] } : {}),
      ...(args['address'] ? { address: args['address'] } : {}),
    },
  });

  const password_hash = await bcrypt.hash(args['password']!, 12);
  const admin = await prisma.staffUser.create({
    data: {
      clinic_id: clinic.id,
      email: args['email']!,
      password_hash,
      first_name: args['firstName']!,
      last_name: args['lastName']!,
      role: 'ADMIN',
    },
  });

  console.log('✅ Clinic created');
  console.log(`   Clinic:  ${clinic.name}  (${clinic.id})`);
  console.log(`   Plan:    ${plan}${trial_ends_at ? ` — expires ${trial_ends_at.toISOString().slice(0, 10)} (${days} days)` : ''}`);
  if (clinic.email) console.log(`   Email:   ${clinic.email}`);
  if (clinic.phone) console.log(`   Phone:   ${clinic.phone}`);
  if (clinic.address) console.log(`   Address: ${clinic.address}`);
  console.log(`   Admin:   ${admin.first_name} ${admin.last_name} <${admin.email}>`);
  console.log('   They can log in now with the email/password you provided.');
}

main()
  .catch((err) => {
    console.error('❌ Failed to create clinic:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
