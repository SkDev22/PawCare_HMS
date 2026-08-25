import { Bell, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notifications";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/permissions";
import { hasFeature } from "@/lib/features";
import { ClinicInformationForm } from "./components/ClinicInformationForm";
import { SubscriptionCard } from "./components/SubscriptionCard";
import { BusinessHoursForm } from "./components/BusinessHoursForm";
import { DataExportCard } from "./components/DataExportCard";

const PLACEHOLDER_SECTIONS = [
  {
    icon: ShieldCheck,
    title: "Security",
    description: "Password policy and session management.",
  },
];

function NotificationPreferencesCard() {
  const { data, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <CardTitle className="text-base">Notification Preferences</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose which alerts you want to receive. Turning one off stops it
            being created for you — it won't show up anywhere, including the
            bell dropdown.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {data?.map((pref) => (
              <div
                key={pref.type}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
              >
                <Label
                  htmlFor={`pref-${pref.type}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {pref.label}
                </Label>
                <Switch
                  id={`pref-${pref.type}`}
                  checked={pref.enabled}
                  onCheckedChange={(checked) =>
                    update.mutate([{ type: pref.type, enabled: checked }])
                  }
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  // Editable clinic settings stay ADMIN-only even though CLINIC_READ (used
  // for printable letterheads) is now available to every role.
  const canEditClinicInfo = hasPermission(role, "CLINIC_WRITE");
  const canExport = hasPermission(role, "REPORT_READ") && hasFeature(user, "REPORTS");

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Clinic and account configuration
        </p>
      </div>

      <div className="space-y-4">
        <SubscriptionCard />

        {canEditClinicInfo && <ClinicInformationForm />}

        {canEditClinicInfo && <BusinessHoursForm />}

        <NotificationPreferencesCard />

        {canExport && <DataExportCard />}

        {PLACEHOLDER_SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <CardTitle className="text-base">{section.title}</CardTitle>
              </div>
              <Badge variant="secondary">Coming soon</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
