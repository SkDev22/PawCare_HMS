import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { EDITABLE_ROLES, type EditableRole, type PermissionKey } from "@pawcare/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useRolePermissionMatrix,
  useTogglePermission,
  useResetRolePermissions,
} from "@/hooks/use-role-permissions";

const ROLE_LABEL: Record<EditableRole, string> = {
  VETERINARIAN: "Veterinarian",
  NURSE: "Nurse",
  RECEPTIONIST: "Receptionist",
  LAB_TECHNICIAN: "Lab Technician",
};

function RolePermissionList({ role }: { role: EditableRole }) {
  const { data, isLoading } = useRolePermissionMatrix();
  const toggle = useTogglePermission();
  const reset = useResetRolePermissions();

  if (isLoading || !data) {
    return (
      <div className="space-y-2 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const entries = data[role];
  const hasOverrides = entries.some((e) => e.isOverridden);

  const grouped = entries.reduce<Record<string, typeof entries>>((acc, entry) => {
    (acc[entry.module] ??= []).push(entry);
    return acc;
  }, {});

  function handleToggle(permission: PermissionKey, granted: boolean) {
    toggle.mutate(
      { role, permission, granted },
      {
        onError: () => toast.error("Failed to update permission. Please try again."),
      },
    );
  }

  function handleReset() {
    reset.mutate(role, {
      onSuccess: () => toast.success(`${ROLE_LABEL[role]} permissions reset to defaults.`),
      onError: () => toast.error("Failed to reset permissions. Please try again."),
    });
  }

  return (
    <div className="pt-4 space-y-5">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={!hasOverrides || reset.isPending}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset to defaults
        </Button>
      </div>

      {Object.entries(grouped).map(([module, moduleEntries]) => (
        <div key={module} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            {module}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {moduleEntries.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
              >
                <Label
                  htmlFor={`perm-${role}-${entry.key}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {entry.label}
                </Label>
                <Switch
                  id={`perm-${role}-${entry.key}`}
                  checked={entry.granted}
                  onCheckedChange={(checked) => handleToggle(entry.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RolePermissionsCard() {
  const [activeTab, setActiveTab] = useState<EditableRole>(EDITABLE_ROLES[0]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <CardTitle className="text-base">Roles & Permissions</CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Grant or revoke what each role can do. Changes apply immediately —
            staff currently signed in don't need to log out.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EditableRole)}>
          <TabsList className="flex-wrap h-auto gap-1">
            {EDITABLE_ROLES.map((role) => (
              <TabsTrigger key={role} value={role} className="text-xs">
                {ROLE_LABEL[role]}
              </TabsTrigger>
            ))}
            <TabsTrigger value="ADMIN" disabled className="text-xs" title="Admin always has full access">
              Admin
            </TabsTrigger>
          </TabsList>

          {EDITABLE_ROLES.map((role) => (
            <TabsContent key={role} value={role}>
              <RolePermissionList role={role} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
