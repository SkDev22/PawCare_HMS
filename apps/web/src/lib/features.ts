import { clinicHasFeature, type FeatureKey } from "@pawcare/shared";
import type { AuthUser } from "@pawcare/shared";

// Mirrors hasPermission() — but gates on the clinic's plan/add-ons (ADR-04)
// rather than the staff member's role. A route or nav item can need both.
export function hasFeature(user: AuthUser | null | undefined, feature: FeatureKey): boolean {
  if (!user) return false;
  return clinicHasFeature(user.plan, feature, user.extra_features);
}
