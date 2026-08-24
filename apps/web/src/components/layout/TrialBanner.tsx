import { Clock } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store";

function daysRemaining(trialEndsAt: string): number {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function TrialBanner() {
  const user = useAuthStore((s) => s.user);

  if (!user || user.plan !== "TRIAL" || !user.trial_ends_at) return null;

  const days = daysRemaining(user.trial_ends_at);

  return (
    <div className="flex items-center justify-center gap-2 bg-orange-50 px-4 py-2 text-xs text-orange-800 border-b border-orange-200 print:hidden">
      <Clock className="h-3.5 w-3.5" />
      {days === 0
        ? "Your free trial ends today."
        : `${days} day${days === 1 ? "" : "s"} left in your free trial.`}
    </div>
  );
}
