// One-off script for changing an existing clinic's plan/entitlements — the
// tool you reach for every time a trial converts to paid, a client buys an
// add-on module, or a trial needs a few more days. No admin UI for this
// exists yet (see clinic:create's header comment for the same caveat).
//
// Identify the clinic by any staff member's email at that clinic:
//
//   pnpm --filter server clinic:upgrade -- --email admin@theirclinic.com --plan PRO
//
// Grant/revoke individual add-on features on top of the plan's bundle —
// e.g. one clinic buying a module (a future Pharmacy module, say) that
// isn't part of its plan tier, without affecting any other clinic:
//
//   pnpm --filter server clinic:upgrade -- --email admin@theirclinic.com --add-feature PHARMACY
//   pnpm --filter server clinic:upgrade -- --email admin@theirclinic.com --remove-feature PHARMACY
//
// Trial housekeeping:
//
//   pnpm --filter server clinic:upgrade -- --email admin@theirclinic.com --clear-trial
//   pnpm --filter server clinic:upgrade -- --email admin@theirclinic.com --extend-trial 7
//
// Flags combine freely in one call, e.g. converting a trial to paid:
//   --plan PRO --clear-trial

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env['DATABASE_URL']!);
const prisma = new PrismaClient({ adapter });

const VALID_PLANS = ['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'] as const;
type Plan = (typeof VALID_PLANS)[number];

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const token = raw[i];
    if (token === '--clear-trial') {
      args['clear-trial'] = 'true';
      continue;
    }
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
  if (!args['email']) {
    console.error('❌ --email is required (any staff member at the clinic you want to change)');
    process.exit(1);
  }

  const staff = await prisma.staffUser.findUnique({
    where: { email: args['email'] },
    include: { clinic: true },
  });
  if (!staff) {
    console.error(`❌ No staff account found with email ${args['email']}`);
    process.exit(1);
  }
  const clinic = staff.clinic;

  const data: {
    plan?: Plan;
    trial_ends_at?: Date | null;
    extra_features?: string[];
  } = {};

  if (args['plan']) {
    const plan = args['plan'].toUpperCase() as Plan;
    if (!VALID_PLANS.includes(plan)) {
      console.error(`❌ --plan must be one of: ${VALID_PLANS.join(', ')}`);
      process.exit(1);
    }
    data.plan = plan;
  }

  if (args['clear-trial']) {
    data.trial_ends_at = null;
  } else if (args['extend-trial']) {
    const days = Number(args['extend-trial']);
    if (!Number.isFinite(days) || days <= 0) {
      console.error('❌ --extend-trial must be a positive number of days');
      process.exit(1);
    }
    const base = clinic.trial_ends_at && clinic.trial_ends_at > new Date() ? clinic.trial_ends_at : new Date();
    data.trial_ends_at = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const extraFeatures = new Set(clinic.extra_features);
  if (args['add-feature']) {
    for (const f of args['add-feature'].split(',').map((s) => s.trim().toUpperCase())) {
      extraFeatures.add(f);
    }
  }
  if (args['remove-feature']) {
    for (const f of args['remove-feature'].split(',').map((s) => s.trim().toUpperCase())) {
      extraFeatures.delete(f);
    }
  }
  if (args['add-feature'] || args['remove-feature']) {
    data.extra_features = [...extraFeatures];
  }

  if (Object.keys(data).length === 0) {
    console.error('❌ Nothing to change — pass at least one of --plan, --add-feature, --remove-feature, --clear-trial, --extend-trial');
    process.exit(1);
  }

  const updated = await prisma.clinic.update({ where: { id: clinic.id }, data });

  console.log('✅ Clinic updated');
  console.log(`   Clinic:         ${updated.name}  (${updated.id})`);
  console.log(`   Plan:           ${updated.plan}`);
  console.log(`   Trial ends at:  ${updated.trial_ends_at ? updated.trial_ends_at.toISOString().slice(0, 10) : '— (no trial limit)'}`);
  console.log(`   Extra features: ${updated.extra_features.length > 0 ? updated.extra_features.join(', ') : '(none)'}`);
  console.log('   Takes effect on their next login or token refresh (within ~15 minutes).');
}

main()
  .catch((err) => {
    console.error('❌ Failed to update clinic:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
