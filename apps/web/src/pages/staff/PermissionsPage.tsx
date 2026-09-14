import { RolePermissionsCard } from "./components/RolePermissionsCard";

export function PermissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Staff Permissions</h1>
        <p className="text-sm text-muted-foreground">
          Control which actions each role can perform in this clinic
        </p>
      </div>

      <RolePermissionsCard />
    </div>
  );
}
