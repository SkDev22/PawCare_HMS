import { clinicHasFeature, type FeatureKey } from "@pawcare/shared";
import type { AuthUser } from "@pawcare/shared";

// Mirrors hasPermission() — but gates on the clinic's plan/add-ons (ADR-04)
// rather than the staff member's role. A route or nav item can need both.
// `feature` accepts an array for an ANY-of check (e.g. Inventory is reachable
// with either the full INVENTORY feature or just the PET_SHOP add-on).
export function hasFeature(
  user: AuthUser | null | undefined,
  feature: FeatureKey | FeatureKey[],
): boolean {
  if (!user) return false;
  const features = Array.isArray(feature) ? feature : [feature];
  return features.some((f) => clinicHasFeature(user.plan, f, user.extra_features));
}
