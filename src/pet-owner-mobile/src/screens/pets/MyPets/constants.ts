import { Ionicons } from "@expo/vector-icons";
import { PetSpecies } from "../../../types/api";
import type { TranslationKey } from "../../../i18n";
import type { Section } from "./types";

export const speciesEmoji: Record<number, string> = {
  [PetSpecies.Dog]: "🐕",
  [PetSpecies.Cat]: "🐈",
  [PetSpecies.Bird]: "🐦",
  [PetSpecies.Rabbit]: "🐇",
  [PetSpecies.Reptile]: "🦎",
  [PetSpecies.Other]: "🐾",
};

export const SEVERITY_COLOR: Record<string, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

export const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  "Up to Date": { bg: "#dcfce7", fg: "#166534" },
  "Due Soon": { bg: "#fef9c3", fg: "#854d0e" },
  Overdue: { bg: "#fee2e2", fg: "#991b1b" },
};

export type TileConfigItem = {
  key: Exclude<Section, null | "triage">;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: TranslationKey;
  color: string;
  bg: string;
};

export const TILE_CONFIG: TileConfigItem[] = [
  { key: "health", icon: "heart", labelKey: "petInfo", color: "#7c3aed", bg: "#f5f3ff" },
  { key: "vaccines", icon: "shield-checkmark", labelKey: "vaccines", color: "#059669", bg: "#ecfdf5" },
  { key: "weight", icon: "analytics", labelKey: "weightLog", color: "#2563eb", bg: "#eff6ff" },
  { key: "records", icon: "folder-open", labelKey: "medicalRecords", color: "#d97706", bg: "#fffbeb" },
];

/** Tab bar in AppNavigator: position absolute, bottom 30, height 70 — content must scroll above it. */
export const SECTION_SCROLL_TAB_BAR_CLEARANCE = 30 + 70 + 24;
