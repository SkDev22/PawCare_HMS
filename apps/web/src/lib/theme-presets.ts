import type { ThemeColorSlug } from "@pawcare/shared";

// HSL triples (space-separated, no commas — matches the `hsl(var(--x))`
// convention already used in index.css). Each preset supplies both a light
// and dark half so the accent color stays correct when the user toggles
// light/dark mode (see useTheme() in context/theme.tsx).
interface ThemeColorSet {
  primary: string;
  primaryForeground: string;
  ring: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarRing: string;
  // Drives the active sidebar nav item's highlight (see
  // sidebarMenuButtonVariants' `data-[active=true]:bg-sidebar-accent` in
  // components/ui/sidebar.tsx). Only set for `light` — dark mode keeps the
  // stylesheet's neutral highlight, matching how green already behaved
  // before per-clinic theming existed.
  sidebarAccent?: string;
  sidebarAccentForeground?: string;
}

// Hex scale for the decorative --brand-50..900 tokens (dashboard cards,
// invoice receipt, profile page). Not theme-mode-dependent — mirrors how
// these tokens already worked before per-clinic theming existed.
type BrandScale = Record<"50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900", string>;

interface ThemePreset {
  label: string;
  /** Swatch color shown in the Settings picker. */
  swatch: string;
  light: ThemeColorSet;
  dark: ThemeColorSet;
  brand: BrandScale;
}

// `green` is copied verbatim from the app's original hardcoded values in
// index.css, so existing clinics see zero visual change by default.
export const THEME_PRESETS: Record<ThemeColorSlug, ThemePreset> = {
  green: {
    label: "Green",
    swatch: "#16a34a",
    light: {
      primary: "142 76% 36%",
      primaryForeground: "210 40% 98%",
      ring: "142 76% 36%",
      sidebarPrimary: "142 76% 36%",
      sidebarPrimaryForeground: "210 40% 98%",
      sidebarRing: "142 76% 36%",
      sidebarAccent: "138 76% 97%",
      sidebarAccentForeground: "143 64% 24%",
    },
    dark: {
      primary: "142 71% 45%",
      primaryForeground: "222.2 47.4% 11.2%",
      ring: "142 71% 45%",
      sidebarPrimary: "142 71% 45%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarRing: "142 71% 45%",
    },
    brand: {
      "50": "#f0fdf4",
      "100": "#dcfce7",
      "200": "#bbf7d0",
      "300": "#86efac",
      "400": "#4ade80",
      "500": "#22c55e",
      "600": "#16a34a",
      "700": "#15803d",
      "800": "#166534",
      "900": "#14532d",
    },
  },
  blue: {
    label: "Blue",
    swatch: "#2563eb",
    light: {
      primary: "221 83% 53%",
      primaryForeground: "210 40% 98%",
      ring: "221 83% 53%",
      sidebarPrimary: "221 83% 53%",
      sidebarPrimaryForeground: "210 40% 98%",
      sidebarRing: "221 83% 53%",
      sidebarAccent: "221 70% 95%",
      sidebarAccentForeground: "221 70% 30%",
    },
    dark: {
      primary: "217 91% 60%",
      primaryForeground: "0 0% 100%",
      ring: "217 91% 60%",
      sidebarPrimary: "217 91% 60%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarRing: "217 91% 60%",
    },
    brand: {
      "50": "#eff6ff",
      "100": "#dbeafe",
      "200": "#bfdbfe",
      "300": "#93c5fd",
      "400": "#60a5fa",
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8",
      "800": "#1e40af",
      "900": "#1e3a8a",
    },
  },
  orange: {
    label: "Orange",
    swatch: "#ea580c",
    light: {
      primary: "21 90% 48%",
      primaryForeground: "210 40% 98%",
      ring: "21 90% 48%",
      sidebarPrimary: "21 90% 48%",
      sidebarPrimaryForeground: "210 40% 98%",
      sidebarRing: "21 90% 48%",
      sidebarAccent: "21 80% 94%",
      sidebarAccentForeground: "21 75% 30%",
    },
    dark: {
      primary: "25 95% 53%",
      primaryForeground: "0 0% 100%",
      ring: "25 95% 53%",
      sidebarPrimary: "25 95% 53%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarRing: "25 95% 53%",
    },
    brand: {
      "50": "#fff7ed",
      "100": "#ffedd5",
      "200": "#fed7aa",
      "300": "#fdba74",
      "400": "#fb923c",
      "500": "#f97316",
      "600": "#ea580c",
      "700": "#c2410c",
      "800": "#9a3412",
      "900": "#7c2d12",
    },
  },
  purple: {
    label: "Purple",
    swatch: "#9333ea",
    light: {
      primary: "271 81% 56%",
      primaryForeground: "210 40% 98%",
      ring: "271 81% 56%",
      sidebarPrimary: "271 81% 56%",
      sidebarPrimaryForeground: "210 40% 98%",
      sidebarRing: "271 81% 56%",
      sidebarAccent: "271 65% 96%",
      sidebarAccentForeground: "271 55% 32%",
    },
    dark: {
      primary: "271 91% 65%",
      primaryForeground: "0 0% 100%",
      ring: "271 91% 65%",
      sidebarPrimary: "271 91% 65%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarRing: "271 91% 65%",
    },
    brand: {
      "50": "#faf5ff",
      "100": "#f3e8ff",
      "200": "#e9d5ff",
      "300": "#d8b4fe",
      "400": "#c084fc",
      "500": "#a855f7",
      "600": "#9333ea",
      "700": "#7e22ce",
      "800": "#6b21a8",
      "900": "#581c87",
    },
  },
  red: {
    label: "Red",
    swatch: "#dc2626",
    light: {
      primary: "0 72% 51%",
      primaryForeground: "210 40% 98%",
      ring: "0 72% 51%",
      sidebarPrimary: "0 72% 51%",
      sidebarPrimaryForeground: "210 40% 98%",
      sidebarRing: "0 72% 51%",
      sidebarAccent: "0 75% 96%",
      sidebarAccentForeground: "0 65% 32%",
    },
    dark: {
      primary: "0 84% 60%",
      primaryForeground: "0 0% 100%",
      ring: "0 84% 60%",
      sidebarPrimary: "0 84% 60%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarRing: "0 84% 60%",
    },
    brand: {
      "50": "#fef2f2",
      "100": "#fee2e2",
      "200": "#fecaca",
      "300": "#fca5a5",
      "400": "#f87171",
      "500": "#ef4444",
      "600": "#dc2626",
      "700": "#b91c1c",
      "800": "#991b1b",
      "900": "#7f1d1d",
    },
  },
  teal: {
    label: "Teal",
    swatch: "#0d9488",
    light: {
      primary: "173 80% 30%",
      primaryForeground: "210 40% 98%",
      ring: "173 80% 30%",
      sidebarPrimary: "173 80% 30%",
      sidebarPrimaryForeground: "210 40% 98%",
      sidebarRing: "173 80% 30%",
      sidebarAccent: "173 55% 93%",
      sidebarAccentForeground: "173 65% 22%",
    },
    dark: {
      primary: "173 80% 40%",
      primaryForeground: "0 0% 100%",
      ring: "173 80% 40%",
      sidebarPrimary: "173 80% 40%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarRing: "173 80% 40%",
    },
    brand: {
      "50": "#f0fdfa",
      "100": "#ccfbf1",
      "200": "#99f6e4",
      "300": "#5eead4",
      "400": "#2dd4bf",
      "500": "#14b8a6",
      "600": "#0d9488",
      "700": "#0f766e",
      "800": "#115e59",
      "900": "#134e4a",
    },
  },
};
