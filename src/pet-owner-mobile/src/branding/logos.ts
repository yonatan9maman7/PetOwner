import { Image, type ImageStyle, type StyleProp } from "react-native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";

export const APP_DISPLAY_NAME = "PetCare";

export const LOGO_HERO = require("../../assets/logo-hero.png");
export const LOGO_HEADER = require("../../assets/logo-header.png");

/** Auth hero: ~130–150 pt tall, max ~320 pt wide. */
export const LOGO_HERO_HEIGHT = 140;
export const LOGO_HERO_MAX_WIDTH = 320;

/** Explore map header — slightly taller than default tab headers. */
export const LOGO_HEADER_HEIGHT_MAP = 44;
export const LOGO_HEADER_HEIGHT = 36;
export const LOGO_HEADER_MAX_WIDTH = 160;

const heroSrc = Image.resolveAssetSource(LOGO_HERO);
const headerSrc = Image.resolveAssetSource(LOGO_HEADER);

export const LOGO_HERO_ASPECT =
  heroSrc.width && heroSrc.height ? heroSrc.width / heroSrc.height : 1.32;

export const LOGO_HEADER_ASPECT =
  headerSrc.width && headerSrc.height ? headerSrc.width / headerSrc.height : 4.33;

export function heroLogoStyle(): StyleProp<ImageStyle> {
  return {
    height: LOGO_HERO_HEIGHT,
    maxWidth: LOGO_HERO_MAX_WIDTH,
    aspectRatio: LOGO_HERO_ASPECT,
    resizeMode: "contain",
  };
}

export function headerLogoStyle(
  height: number = LOGO_HEADER_HEIGHT,
): StyleProp<ImageStyle> {
  const maxWidth = Math.round((LOGO_HEADER_MAX_WIDTH / LOGO_HEADER_HEIGHT) * height);
  return {
    height,
    maxWidth,
    aspectRatio: LOGO_HEADER_ASPECT,
    resizeMode: "contain",
  };
}

export function prefetchBrandLogos(): void {
  for (const asset of [LOGO_HERO, LOGO_HEADER]) {
    const src = Image.resolveAssetSource(asset);
    if (src?.uri) {
      Image.prefetch(src.uri).catch(() => {});
    }
  }
}

let pdfLogoDataUriCache: string | null | undefined;

/** Base64 data URI for embedding the brand logo in print/PDF HTML. */
export async function getBrandLogoDataUriForPdf(): Promise<string | null> {
  if (pdfLogoDataUriCache !== undefined) {
    return pdfLogoDataUriCache;
  }
  try {
    const asset = Asset.fromModule(LOGO_HERO);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) {
      pdfLogoDataUriCache = null;
      return null;
    }
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    pdfLogoDataUriCache = `data:image/png;base64,${base64}`;
    return pdfLogoDataUriCache;
  } catch {
    pdfLogoDataUriCache = null;
    return null;
  }
}
