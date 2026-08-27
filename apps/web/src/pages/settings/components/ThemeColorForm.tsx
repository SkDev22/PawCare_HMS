import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import type { ThemeColorSlug } from "@pawcare/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinic, useUpdateClinic } from "@/hooks/use-clinic";
import { useAuthStore } from "@/stores/auth.store";
import { hasFeature } from "@/lib/features";
import { THEME_PRESETS } from "@/lib/theme-presets";

function getServerErrorMessage(err: unknown): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "response" in err &&
    err.response !== null &&
    typeof err.response === "object" &&
    "data" in err.response
  ) {
    const data = err.response.data as { error?: { message?: string } };
    return (
      data?.error?.message ?? "Failed to update theme color. Please try again."
    );
  }
  return "Unable to connect to the server. Check your network.";
}

export function ThemeColorForm() {
  const { data: clinic, isLoading } = useClinic();
  const updateClinic = useUpdateClinic();
  const user = useAuthStore((s) => s.user);
  const isLocked = !hasFeature(user, "THEME_CUSTOMIZATION");
  const activeSlug =
    (clinic?.theme_color as ThemeColorSlug | undefined) ?? "green";

  const onSelect = async (slug: ThemeColorSlug) => {
    if (isLocked) {
      toast("Theme customization is a Pro feature", {
        description: "Upgrade your plan to change your clinic's accent color.",
      });
      return;
    }
    if (slug === activeSlug || updateClinic.isPending) return;
    try {
      await updateClinic.mutateAsync({ theme_color: slug });
    } catch (err) {
      toast.error(getServerErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <Palette className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Theme Color</CardTitle>
            {isLocked && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Pro
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLocked
              ? "Upgrade to Pro or Enterprise to customize your clinic's accent color."
              : "Sets the accent color for buttons, links, and the sidebar across your clinic's account."}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full" />
            ))}
          </div>
        ) : (
          <div
            className={`flex flex-wrap gap-3 ${isLocked ? "opacity-50" : ""}`}
          >
            {(
              Object.entries(THEME_PRESETS) as [
                ThemeColorSlug,
                (typeof THEME_PRESETS)[ThemeColorSlug],
              ][]
            ).map(([slug, preset]) => {
              const isActive = slug === activeSlug;
              return (
                <button
                  key={slug}
                  type="button"
                  aria-label={preset.label}
                  aria-pressed={isActive}
                  aria-disabled={isLocked}
                  disabled={updateClinic.isPending}
                  onClick={() => onSelect(slug)}
                  className={`flex flex-col items-center gap-1.5 ${
                    isLocked ? "cursor-not-allowed" : ""
                  }`}
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border transition-shadow"
                    style={{
                      backgroundColor: preset.swatch,
                      boxShadow: isActive
                        ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${preset.swatch}`
                        : undefined,
                    }}
                  >
                    {isActive && (
                      <Check className="h-4 w-4 text-white drop-shadow" />
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
