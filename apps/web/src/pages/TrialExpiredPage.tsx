import { useNavigate } from "react-router-dom";
import { PawPrint, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth.store";

export function TrialExpiredPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 font-medium">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <PawPrint className="size-4" />
        </div>
        PawCare HMS
      </div>

      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center gap-3 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Your free trial has ended</p>
            <p className="text-sm text-muted-foreground">
              Your one-month trial of PawCare HMS is over. Your clinic's data is safe
              and untouched — reach out to us to upgrade and pick up right where you
              left off.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
