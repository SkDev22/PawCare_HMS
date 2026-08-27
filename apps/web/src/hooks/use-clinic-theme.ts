import { useEffect } from "react";
import type { ThemeColorSlug } from "@pawcare/shared";
import { useClinic } from "./use-clinic";
import { useTheme } from "../context/theme";
import { THEME_PRESETS } from "../lib/theme-presets";

const CSS_VAR_MAP = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  ring: "--ring",
  sidebarPrimary: "--sidebar-primary",
  sidebarPrimaryForeground: "--sidebar-primary-foreground",
  sidebarRing: "--sidebar-ring",
} as const;

// Only set for `light` presets (see ThemeColorSet in theme-presets.ts) — in
// dark mode these are removed so the stylesheet's neutral highlight applies.
const OPTIONAL_VAR_MAP = {
  sidebarAccent: "--sidebar-accent",
  sidebarAccentForeground: "--sidebar-accent-foreground",
} as const;

// Applies the clinic's chosen accent color as inline CSS variable overrides
// on <html>, which take precedence over the stylesheet's :root/.dark rules.
// Re-runs whenever the clinic's color or the resolved light/dark mode
// changes, and removes the overrides on unmount (logout) so a stale color
// doesn't leak into the next session on the untenanted /login page.
export function useClinicTheme() {
  const { data: clinic } = useClinic();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const slug = (clinic?.theme_color as ThemeColorSlug | undefined) ?? "green";
    const preset = THEME_PRESETS[slug] ?? THEME_PRESETS.green;
    const colors = preset[resolvedTheme];
    const root = document.documentElement.style;

    for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
      root.setProperty(cssVar, colors[key as keyof typeof CSS_VAR_MAP]);
    }
    for (const [key, cssVar] of Object.entries(OPTIONAL_VAR_MAP)) {
      const value = colors[key as keyof typeof OPTIONAL_VAR_MAP];
      if (value) root.setProperty(cssVar, value);
      else root.removeProperty(cssVar);
    }
    for (const [shade, hex] of Object.entries(preset.brand)) {
      root.setProperty(`--brand-${shade}`, hex);
    }

    return () => {
      for (const cssVar of Object.values(CSS_VAR_MAP)) {
        root.removeProperty(cssVar);
      }
      for (const cssVar of Object.values(OPTIONAL_VAR_MAP)) {
        root.removeProperty(cssVar);
      }
      for (const shade of Object.keys(preset.brand)) {
        root.removeProperty(`--brand-${shade}`);
      }
    };
  }, [clinic?.theme_color, resolvedTheme]);
}
