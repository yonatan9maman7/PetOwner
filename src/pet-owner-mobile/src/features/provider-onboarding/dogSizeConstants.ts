import type { TranslationKey } from "../../i18n";
import type { DogSize } from "../../types/api";

export const DOG_SIZE_ORDER: DogSize[] = ["SMALL", "MEDIUM", "LARGE", "GIANT"];

/** Icon size (MaterialCommunityIcons `dog`) — visual scale Small → Giant */
export const DOG_ICON_SIZES: Record<DogSize, number> = {
  SMALL: 22,
  MEDIUM: 28,
  LARGE: 34,
  GIANT: 40,
};

export const DOG_SIZE_LABEL_KEYS: Record<DogSize, TranslationKey> = {
  SMALL: "sizeSmall",
  MEDIUM: "sizeMedium",
  LARGE: "sizeLarge",
  GIANT: "sizeGiant",
};
