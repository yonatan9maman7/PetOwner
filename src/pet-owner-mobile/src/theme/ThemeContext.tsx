import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useThemeStore } from "../store/themeStore";
import type { ThemePreference } from "../store/themeStore";

/* ─── Color palette type ─── */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  primaryText: string;
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  shadow: string;
  overlay: string;
  inputBg: string;
  cardHighlight: string;
  /* icon tint backgrounds */
  iconBlueBg: string;
  iconGreenBg: string;
  iconPurpleBg: string;
  iconOrangeBg: string;
  iconCyanBg: string;
  iconIndigoBg: string;
  iconSkyBg: string;
  iconTealBg: string;
  iconSlateBg: string;
}

/* ─── Light palette ─── */

const light: ThemeColors = {
  background: "#f4fafd",
  surface: "#ffffff",
  surfaceSecondary: "#f1f5f9",
  surfaceTertiary: "#f8fafc",
  text: "#001a5a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  textInverse: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  primary: "#2563eb",
  primaryLight: "#eef2ff",
  primaryText: "#ffffff",
  danger: "#dc2626",
  dangerLight: "#fef2f2",
  success: "#059669",
  successLight: "#ecfdf5",
  warning: "#ea580c",
  warningLight: "#fff7ed",
  tabBar: "#001a5a",
  tabBarActive: "#ffffff",
  tabBarInactive: "rgba(255,255,255,0.75)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.5)",
  inputBg: "#f8fafc",
  cardHighlight: "#eff6ff",
  iconBlueBg: "#eef2ff",
  iconGreenBg: "#ecfdf5",
  iconPurpleBg: "#f5f3ff",
  iconOrangeBg: "#fff7ed",
  iconCyanBg: "#ecfeff",
  iconIndigoBg: "#eef2ff",
  iconSkyBg: "#f0f9ff",
  iconTealBg: "#f0fdfa",
  iconSlateBg: "#f8fafc",
};

/* ─── Dark palette ─── */

const dark: ThemeColors = {
  background: "#0c1322",
  surface: "#1a2236",
  surfaceSecondary: "#243044",
  surfaceTertiary: "#1e2d42",
  text: "#e8edf4",
  textSecondary: "#8896ab",
  textMuted: "#5a6577",
  textInverse: "#0c1322",
  border: "#2a3a52",
  borderLight: "#1e2d42",
  primary: "#3b82f6",
  primaryLight: "#1e3a5f",
  primaryText: "#ffffff",
  danger: "#ef4444",
  dangerLight: "#3b1a1a",
  success: "#10b981",
  successLight: "#0d3326",
  warning: "#f97316",
  warningLight: "#3b2712",
  tabBar: "#0c1322",
  tabBarActive: "#ffffff",
  tabBarInactive: "rgba(255,255,255,0.55)",
  shadow: "#000000",
  overlay: "rgba(0,0,0,0.7)",
  inputBg: "#1e2d42",
  cardHighlight: "#1e3a5f",
  iconBlueBg: "#1e2d52",
  iconGreenBg: "#0d3326",
  iconPurpleBg: "#2a1f4e",
  iconOrangeBg: "#3b2712",
  iconCyanBg: "#0d3333",
  iconIndigoBg: "#1e2d52",
  iconSkyBg: "#0d2940",
  iconTealBg: "#0d3330",
  iconSlateBg: "#1e2d42",
};

/* ─── Context ─── */

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: light,
  isDark: false,
  preference: "system",
  setPreference: async () => {},
});

/* ─── Provider ─── */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const isDark =
    preference === "system"
      ? systemScheme === "dark"
      : preference === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* ─── Hook ─── */

export function useTheme() {
  return useContext(ThemeContext);
}
