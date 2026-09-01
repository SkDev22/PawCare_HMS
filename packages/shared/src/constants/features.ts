// Per-clinic entitlements (ADR-04): which modules a clinic's plan unlocks.
// A clinic's plan is a claim on its JWT (see server/src/lib/jwt.ts), so both
// the frontend (hiding nav/routes) and the backend (authorizeFeature
// middleware) can gate on it without an extra DB round trip per request.

export const CLINIC_PLANS = ["TRIAL", "BASIC", "PRO", "ENTERPRISE"] as const;
export type ClinicPlanType = (typeof CLINIC_PLANS)[number];

export const FEATURES = [
  "PATIENTS",
  "APPOINTMENTS",
  "EMR",
  "BILLING",
  "INVENTORY",
  "STAFF",
  "LABORATORY",
  "WARD",
  "NOTIFICATIONS",
  "REPORTS",
  "THEME_CUSTOMIZATION",
  // Email channel for owner-facing automated reminders (appointment,
  // vaccine-due, overdue-invoice) — BASIC stays in-app only, matching the
  // subscription plan chart. SMS gets its own key once that channel exists.
  "EMAIL_NOTIFICATIONS",
  // The "Today's Appointments" dashboard widget specifically — decoupled
  // from the APPOINTMENTS module itself since the subscription chart gates
  // the dashboard tile separately from the module (both happen to be
  // PRO+ only today, but that's coincidence, not a dependency).
  "DASHBOARD_TODAY_APPOINTMENTS",
] as const;
export type FeatureKey = (typeof FEATURES)[number];

// TRIAL and ENTERPRISE get everything; BASIC/PRO are deliberately narrower
// so the mechanism actually does something — tune freely per real pricing.
export const PLAN_FEATURES: Record<ClinicPlanType, readonly FeatureKey[]> = {
  TRIAL: FEATURES,
  BASIC: [
    "PATIENTS",
    "EMR",
    "BILLING",
    "STAFF",
    "NOTIFICATIONS",
    "REPORTS", // Customize
  ], // In app notifications only
  PRO: [
    "PATIENTS",
    "APPOINTMENTS",
    "EMR",
    "BILLING",
    "INVENTORY",
    "STAFF",
    "LABORATORY",
    "NOTIFICATIONS",
    "REPORTS",
    "THEME_CUSTOMIZATION",
    "EMAIL_NOTIFICATIONS",
    "DASHBOARD_TODAY_APPOINTMENTS",
  ],
  ENTERPRISE: FEATURES,
};

export function getClinicFeatures(plan: ClinicPlanType): readonly FeatureKey[] {
  return PLAN_FEATURES[plan] ?? [];
}

// A clinic's real entitlement is its plan's bundle *plus* whatever individual
// add-ons have been granted to it specifically — e.g. one hospital buying a
// module (say, a future Pharmacy module) that isn't part of its plan tier,
// without changing what any other clinic on that same plan sees.
export function getEffectiveFeatures(
  plan: ClinicPlanType,
  extraFeatures: readonly string[] = [],
): FeatureKey[] {
  return [
    ...new Set([...getClinicFeatures(plan), ...extraFeatures]),
  ] as FeatureKey[];
}

export function clinicHasFeature(
  plan: ClinicPlanType,
  feature: FeatureKey,
  extraFeatures: readonly string[] = [],
): boolean {
  return getEffectiveFeatures(plan, extraFeatures).includes(feature);
}

// A TRIAL clinic past its trial_ends_at date loses access entirely until
// converted to a paid plan — checked from the JWT's plan/trial_ends_at claims,
// so it self-corrects on the next token refresh without a background job.
export function isTrialExpired(
  plan: ClinicPlanType,
  trialEndsAt: string | null,
): boolean {
  return (
    plan === "TRIAL" &&
    trialEndsAt !== null &&
    new Date(trialEndsAt) < new Date()
  );
}

// Included active-staff seats per plan — null means unlimited. A "seat" is
// any active StaffUser regardless of role, ADMIN included.
export const PLAN_SEAT_LIMITS: Record<ClinicPlanType, number | null> = {
  TRIAL: null,
  BASIC: 3,
  PRO: 12,
  ENTERPRISE: null,
};

// An explicit per-clinic override (Clinic.seat_limit_override, set via the
// clinic:upgrade script) always wins over the plan's default.
export function getSeatLimit(
  plan: ClinicPlanType,
  seatLimitOverride?: number | null,
): number | null {
  return seatLimitOverride ?? PLAN_SEAT_LIMITS[plan];
}
