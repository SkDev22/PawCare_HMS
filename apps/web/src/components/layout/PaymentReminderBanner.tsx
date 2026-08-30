import { CreditCard } from "lucide-react";
import { getPaymentReminderStatus } from "@pawcare/shared";
import { useAuthStore } from "../../stores/auth.store";
import { useClinic } from "../../hooks/use-clinic";

// BASIC/PRO/ENTERPRISE have no auto-billing, so nothing else ever reminds a
// clinic a manual payment is due. Deliberately persistent (no dismiss) —
// unlike TrialBanner's countdown, this is the only thing standing between
// the clinic and forgetting to pay, so it should be harder to ignore, not
// easier. ADMIN-only: billing is an admin concern, and other roles can't
// act on it. Mutually exclusive with TrialBanner (TRIAL vs. paid plans).
export function PaymentReminderBanner() {
  const user = useAuthStore((s) => s.user);
  const { data: clinic } = useClinic();

  if (!user || user.role !== "ADMIN" || user.plan === "TRIAL") return null;
  if (!clinic?.next_payment_due_at) return null;

  const status = getPaymentReminderStatus(clinic.next_payment_due_at);
  if (!status) return null;

  const { daysUntilDue, overdue } = status;
  const daysOverdue = Math.abs(daysUntilDue);

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-xs border-b print:hidden ${
        overdue
          ? "bg-red-50 text-red-800 border-red-200"
          : "bg-amber-50 text-amber-800 border-amber-200"
      }`}
    >
      <CreditCard className="h-3.5 w-3.5" />
      {overdue
        ? `Payment is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue — please renew to avoid service interruption.`
        : daysUntilDue === 0
          ? "Your subscription payment is due today."
          : `Subscription payment due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}.`}
    </div>
  );
}
