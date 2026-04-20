import type { TranslationKey } from "../../i18n";
import { PetSpecies } from "../../types/api";

/** Maps canonical storage labels (English) to i18n keys for display on pet cards. */
export const ALLERGY_LABEL_I18N: Record<string, TranslationKey> = {
  Chicken: "allergyChicken",
  Beef: "allergyBeef",
  Dairy: "allergyDairy",
  "Grain / wheat": "allergyGrainWheat",
  Soy: "allergySoy",
  Fish: "allergyFish",
  Eggs: "allergyEggs",
  Lamb: "allergyLamb",
  "Flea bites": "allergyFleaBite",
  Pollen: "allergyPollen",
  "Dust mites": "allergyDustMites",
  Mold: "allergyMold",
  "Food preservatives": "allergyPreservatives",
  Medication: "allergyMedication",
  "Rubber / latex": "allergyRubberLatex",
  Other: "allergyOther",
};

export const DOG_BREEDS = [
  "Mixed / Mutt",
  "Golden Retriever",
  "Labrador",
  "German Shepherd",
  "Poodle",
  "Border Collie",
  "Malinois",
  "French Bulldog",
  "Shih Tzu",
  "Pomeranian",
  "Other",
] as const;

export const CAT_BREEDS = [
  "Mixed",
  "Persian",
  "Siamese",
  "British Shorthair",
  "Sphynx",
  "Maine Coon",
  "Street Cat",
  "Tricolor / Calico",
  "Other",
] as const;

export function getBreedsForSpecies(s: PetSpecies | null): string[] {
  if (s === PetSpecies.Dog) return [...DOG_BREEDS];
  if (s === PetSpecies.Cat) return [...CAT_BREEDS];
  return [];
}

/** Canonical allergy ids; stored as comma-separated English labels for API / chips. */
export const ALLERGY_OPTIONS = [
  { id: "chicken", storageLabel: "Chicken" },
  { id: "beef", storageLabel: "Beef" },
  { id: "dairy", storageLabel: "Dairy" },
  { id: "grain_wheat", storageLabel: "Grain / wheat" },
  { id: "soy", storageLabel: "Soy" },
  { id: "fish", storageLabel: "Fish" },
  { id: "eggs", storageLabel: "Eggs" },
  { id: "lamb", storageLabel: "Lamb" },
  { id: "flea_bite", storageLabel: "Flea bites" },
  { id: "pollen", storageLabel: "Pollen" },
  { id: "dust_mites", storageLabel: "Dust mites" },
  { id: "mold", storageLabel: "Mold" },
  { id: "preservatives", storageLabel: "Food preservatives" },
  { id: "medication", storageLabel: "Medication" },
  { id: "rubber_latex", storageLabel: "Rubber / latex" },
  { id: "other", storageLabel: "Other" },
] as const;

export type AllergyOptionId = (typeof ALLERGY_OPTIONS)[number]["id"];

function allergyLabelToId(): Map<string, string> {
  const m = new Map<string, string>();
  for (const o of ALLERGY_OPTIONS) {
    m.set(o.id.toLowerCase(), o.id);
    m.set(o.storageLabel.toLowerCase(), o.id);
  }
  return m;
}

const LABEL_TO_ID = allergyLabelToId();

export function serializeAllergies(
  selectedIds: Set<string>,
  otherDetail: string,
): string {
  const parts: string[] = [];
  for (const o of ALLERGY_OPTIONS) {
    if (o.id === "other") continue;
    if (selectedIds.has(o.id)) parts.push(o.storageLabel);
  }
  if (selectedIds.has("other")) {
    const detail = otherDetail.trim();
    if (detail) parts.push(detail);
    else parts.push("Other");
  }
  return parts.join(", ");
}

export function parseAllergiesFromString(raw: string): {
  ids: Set<string>;
  otherText: string;
} {
  const ids = new Set<string>();
  let otherText = "";
  if (!raw.trim()) return { ids, otherText };

  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of segments) {
    const id = LABEL_TO_ID.get(part.toLowerCase());
    if (id) {
      if (id === "other") ids.add("other");
      else ids.add(id);
      continue;
    }
    const lower = part.toLowerCase();
    let matched = false;
    for (const o of ALLERGY_OPTIONS) {
      if (o.id === "other") continue;
      if (o.storageLabel.toLowerCase() === lower) {
        ids.add(o.id);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    ids.add("other");
    otherText = otherText ? `${otherText}, ${part}` : part;
  }

  return { ids, otherText };
}

function normalizeBreed(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "'");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/**
 * Returns a canonical breed from the list if the user's text clearly matches one
 * (typo, substring, or close edit distance). Excludes "Other".
 */
export function findSimilarBreed(userInput: string, breedList: string[]): string | null {
  const n = normalizeBreed(userInput);
  if (!n) return null;

  const candidates = breedList.filter((b) => b !== "Other");
  if (candidates.length === 0) return null;

  for (const b of candidates) {
    const bn = normalizeBreed(b);
    if (bn === n) return null;
  }

  for (const b of candidates) {
    const bn = normalizeBreed(b);
    if (bn === n) return b;
  }

  for (const b of candidates) {
    const bn = normalizeBreed(b);
    if (n.length >= 4 && (bn.includes(n) || n.includes(bn))) return b;
  }

  let best: string | null = null;
  let bestRatio = 1;
  for (const b of candidates) {
    const bn = normalizeBreed(b);
    const maxLen = Math.max(n.length, bn.length);
    if (maxLen === 0) continue;
    const d = levenshtein(n, bn);
    const ratio = d / maxLen;
    if (ratio <= 0.34 && ratio < bestRatio) {
      bestRatio = ratio;
      best = b;
    }
  }
  return best;
}
