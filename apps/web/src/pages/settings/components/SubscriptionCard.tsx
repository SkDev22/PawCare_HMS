import { CreditCard, CheckCircle2 } from "lucide-react";
import { getEffectiveFeatures, getClinicFeatures, type FeatureKey } from "@pawcare/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth.store";

const PLAN_LABELS: Record<string, string> = {
  TRIAL: "Trial",
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const FEATURE_LABELS: Record<FeatureKey, string> = {
  PATIENTS: "Patients",
  APPOINTMENTS: "Appointments",
  EMR: "Medical Records",
  BILLING: "Billing",
  INVENTORY: "Inventory",
  STAFF: "Staff Management",
  LABORATORY: "Laboratory",
  WARD: "Ward & Hospitalization",
  NOTIFICATIONS: "Notifications",
  REPORTS: "Reports & Analytics",
};

function daysRemaining(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function SubscriptionCard() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const { plan, trial_ends_at, extra_features } = user;
  const baseFeatures = getClinicFeatures(plan);
  const effectiveFeatures = getEffectiveFeatures(plan, extra_features);
  const addOns = extra_features.filter((f) => !baseFeatures.includes(f as FeatureKey));

  const isTrial = plan === "TRIAL" && trial_ends_at !== null;
  const daysLeft = isTrial ? daysRemaining(trial_ends_at) : null;
  const trialExpired = daysLeft !== null && daysLeft < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <CardTitle className="text-base">Subscription Plan</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your clinic's current plan and included modules.
            </p>
          </div>
        </div>
        <Badge variant={trialExpired ? "destructive" : "secondary"}>
          {PLAN_LABELS[plan] ?? plan}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTrial && (
          <p className={`text-sm ${trialExpired ? "text-destructive" : "text-muted-foreground"}`}>
            {trialExpired
              ? "Your trial has ended. Contact us to upgrade and restore full access."
              : `Trial ends ${new Date(trial_ends_at).toLocaleDateString()} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {effectiveFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span>{FEATURE_LABELS[feature] ?? feature}</span>
              {addOns.includes(feature) && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Add-on
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
