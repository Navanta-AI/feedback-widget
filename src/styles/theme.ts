/** Color palette and glassmorphism tokens derived from the accent color */
export interface ThemeColors {
  accent: string;
  accentLight: string;
  accentDark: string;
  accentGlow: string;
  accentGradient: string;
  // Neutral primary action (DS --primary / --primary-foreground). Near-black in
  // light, near-white in dark. This — not the brand accent — drives primary buttons.
  primary: string;
  primaryHover: string;
  primaryFg: string;
  // Neutral secondary action (DS --secondary / --secondary-foreground). Filled
  // light-gray icon buttons (import/export/delete-all).
  secondary: string;
  secondaryHover: string;
  secondaryFg: string;
  // Neutral focus ring (DS --ring). Purple is reserved for brand accent only.
  ring: string;
  // Destructive action set (DS --destructive). Distinct from the "bug" type chip.
  danger: string;
  dangerHover: string;
  dangerBg: string;
  bg: string;
  bgHover: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  shadow: string;
  // Glass tokens
  glassBg: string;
  glassBgHeavy: string;
  glassBorder: string;
  glassBorderSubtle: string;
  // Feedback type colors
  typeQuestion: string;
  typeChange: string;
  typeBug: string;
  typeOther: string;
  // Soft type backgrounds (pastel)
  typeQuestionBg: string;
  typeChangeBg: string;
  typeBugBg: string;
  typeOtherBg: string;
  // Status filter colors
  statusOpen: string;
  statusOpenBg: string;
  statusResolved: string;
  statusResolvedBg: string;
}

// Navanta DS brand accent (--kds-color-brand-accent). Kept separate from the
// neutral core — it tints IRIS-voice accents only, not primary actions.
const DEFAULT_ACCENT = "#6440b6";
const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
const HEX3_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX8_RE = /^#[0-9a-fA-F]{8}$/;

/**
 * Normalize an accent color to a 6-digit hex string.
 *
 * **Only hex formats are accepted:**
 * - `#RGB`      (3-digit shorthand, expanded to 6-digit)
 * - `#RRGGBB`   (standard 6-digit)
 * - `#RRGGBBAA` (8-digit with alpha, alpha is stripped)
 *
 * Any other CSS color format (named colors like `"red"`, `hsl()`, `rgb()`,
 * `oklch()`, etc.) is **not** supported and will fall back to the default
 * accent color with a console warning.
 */
function normalizeHex(raw: string): string {
  if (HEX6_RE.test(raw)) return raw;
  const short = HEX3_RE.test(raw) ? raw.match(HEX3_RE) : null;
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (HEX8_RE.test(raw)) return raw.slice(0, 7);

  console.warn(
    `[siteping] Invalid accentColor "${raw}" — only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`,
  );
  return DEFAULT_ACCENT;
}

/** Darken a hex color by a percentage (0-1) */
function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Detect if user prefers dark mode via media query */
function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve 'auto' theme to 'light' or 'dark' based on system preference */
export function resolveTheme(theme?: "light" | "dark" | "auto"): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "auto") return prefersDark() ? "dark" : "light";
  return "light";
}

export function buildThemeColors(accent: string = DEFAULT_ACCENT, theme?: "light" | "dark" | "auto"): ThemeColors {
  const hex = normalizeHex(accent);
  const dark = darkenHex(hex, 0.15);
  const resolved = resolveTheme(theme);

  if (resolved === "dark") {
    return {
      accent: hex,
      accentLight: hex + "22", // slightly more visible on dark bg
      accentDark: dark,
      accentGlow: hex + "44",
      accentGradient: `linear-gradient(135deg, ${hex}, ${dark})`,
      // Neutral primary — DS dark: near-white button, dark text.
      primary: "#fafafa",
      primaryHover: "#e5e5e5",
      primaryFg: "#232122",
      secondary: "#27272a",
      secondaryHover: "#323238",
      secondaryFg: "#fafafa",
      ring: "#71717a",
      danger: "#f87171",
      dangerHover: "#ef4444",
      dangerBg: "rgba(248, 113, 113, 0.15)",
      bg: "#18181b",
      bgHover: "#27272a",
      text: "#fafafa",
      textSecondary: "#a1a1ab",
      textTertiary: "#71717a",
      border: "#3f3f46",
      shadow: "rgba(0, 0, 0, 0.3)",
      // Solid dark card surfaces (see light-theme note on glass tokens).
      glassBg: "rgba(24, 24, 27, 0.97)",
      glassBgHeavy: "#18181b",
      glassBorder: "#3f3f46",
      glassBorderSubtle: "#27272a",
      // Type colors stay vibrant on dark
      typeQuestion: "#60a5fa",
      typeChange: "#fbbf24",
      typeBug: "#f87171",
      typeOther: "#94a3b8",
      // Dark pastel backgrounds
      typeQuestionBg: "rgba(59, 130, 246, 0.15)",
      typeChangeBg: "rgba(245, 158, 11, 0.15)",
      typeBugBg: "rgba(239, 68, 68, 0.15)",
      typeOtherBg: "rgba(100, 116, 139, 0.15)",
      // Status colors — vivid green / cool gray on dark
      statusOpen: "#4ade80",
      statusOpenBg: "rgba(74, 222, 128, 0.15)",
      statusResolved: "#94a3b8",
      statusResolvedBg: "rgba(148, 163, 184, 0.15)",
    };
  }

  // Light theme — Navanta portal tokens: solid white surfaces, zinc neutrals,
  // hairline borders, and the semantic info/warning/destructive/success set.
  return {
    accent: hex,
    accentLight: hex + "14", // 8% opacity
    accentDark: dark,
    accentGlow: hex + "33", // 20% opacity
    accentGradient: `linear-gradient(135deg, ${hex}, ${dark})`,
    // Neutral primary — DS light: near-black button, white text (--primary #232122).
    primary: "#232122",
    primaryHover: "#3a3839", // ≈ primary/90
    primaryFg: "#ffffff",
    secondary: "#f4f4f5", // DS --secondary
    secondaryHover: "#e9e9ec",
    secondaryFg: "#27272a", // DS --secondary-foreground
    ring: "#c4c4c8", // DS --ring
    danger: "#dc2626", // DS --destructive
    dangerHover: "#b91c1c",
    dangerBg: "#fef2f2",
    bg: "#ffffff",
    bgHover: "#fafafa", // neutral-50
    text: "#18181b", // neutral-900
    textSecondary: "#52525c", // neutral-600
    textTertiary: "#a1a1ab", // neutral-400 (placeholder tier)
    border: "#e4e4e7", // neutral-200
    shadow: "rgba(16, 24, 40, 0.06)",
    // "Glass" tokens resolved to solid Navanta card surfaces — the portal
    // design language is flat white cards with hairline borders, not frosted
    // glass. Near-opaque bg keeps the blur var harmless where applied.
    glassBg: "rgba(255, 255, 255, 0.97)",
    glassBgHeavy: "#ffffff",
    glassBorder: "#e4e4e7",
    glassBorderSubtle: "#f0f2f5",
    // Feedback-type colors → Navanta semantic palette
    typeQuestion: "#006ba7", // info-700
    typeChange: "#9e3900", // warning-800
    typeBug: "#ca0005", // destructive-700
    typeOther: "#52525c", // neutral-600
    typeQuestionBg: "#f0f9ff", // info-50
    typeChangeBg: "#fffbea", // warning-50
    typeBugBg: "#fff1f2", // destructive-50
    typeOtherBg: "#f4f4f5", // neutral-100
    // Status colors — Navanta success / neutral
    statusOpen: "#008234", // success-700
    statusOpenBg: "#ecfef3", // success-50
    statusResolved: "#52525c",
    statusResolvedBg: "#f4f4f5",
  };
}

export function getTypeColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case "question":
      return colors.typeQuestion;
    case "change":
      return colors.typeChange;
    case "bug":
      return colors.typeBug;
    default:
      return colors.typeOther;
  }
}

export function getTypeBgColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case "question":
      return colors.typeQuestionBg;
    case "change":
      return colors.typeChangeBg;
    case "bug":
      return colors.typeBugBg;
    default:
      return colors.typeOtherBg;
  }
}

export function cssVariables(colors: ThemeColors): string {
  return `
    --sp-accent: ${colors.accent};
    --sp-accent-light: ${colors.accentLight};
    --sp-accent-dark: ${colors.accentDark};
    --sp-accent-glow: ${colors.accentGlow};
    --sp-accent-gradient: ${colors.accentGradient};
    --sp-primary: ${colors.primary};
    --sp-primary-hover: ${colors.primaryHover};
    --sp-primary-fg: ${colors.primaryFg};
    --sp-secondary: ${colors.secondary};
    --sp-secondary-hover: ${colors.secondaryHover};
    --sp-secondary-fg: ${colors.secondaryFg};
    --sp-ring: ${colors.ring};
    --sp-danger: ${colors.danger};
    --sp-danger-hover: ${colors.dangerHover};
    --sp-danger-bg: ${colors.dangerBg};
    --sp-bg: ${colors.bg};
    --sp-bg-hover: ${colors.bgHover};
    --sp-text: ${colors.text};
    --sp-text-secondary: ${colors.textSecondary};
    --sp-text-tertiary: ${colors.textTertiary};
    --sp-border: ${colors.border};
    --sp-shadow: ${colors.shadow};
    --sp-glass-bg: ${colors.glassBg};
    --sp-glass-bg-heavy: ${colors.glassBgHeavy};
    --sp-glass-border: ${colors.glassBorder};
    --sp-glass-border-subtle: ${colors.glassBorderSubtle};
    --sp-type-question: ${colors.typeQuestion};
    --sp-type-change: ${colors.typeChange};
    --sp-type-bug: ${colors.typeBug};
    --sp-type-other: ${colors.typeOther};
    --sp-type-question-bg: ${colors.typeQuestionBg};
    --sp-type-change-bg: ${colors.typeChangeBg};
    --sp-type-bug-bg: ${colors.typeBugBg};
    --sp-type-other-bg: ${colors.typeOtherBg};
    --sp-radius-md: 6px;
    --sp-radius: 8px;
    --sp-radius-lg: 12px;
    --sp-radius-xl: 16px;
    --sp-radius-full: 9999px;
    --sp-blur: 12px;
    --sp-blur-heavy: 20px;
    --sp-shadow-xs: 0 0 0.5px 0 rgba(0, 0, 0, 0.25), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --sp-shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.08);
    --sp-shadow-md: 0 4px 12px rgba(16, 24, 40, 0.1);
    --sp-shadow-lg: 0 12px 28px rgba(16, 24, 40, 0.14);
    --sp-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    --sp-font: var(--font-geist-sans, "Geist"), "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  `;
}
