import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import type { ProviderPublicProfileDto } from "../../../types/api";
import { publicProviderProfileUrl } from "../../../config/publicLinks";

/**
 * Portrait card sized for sharp WhatsApp sharing at ~1080px logical width on @3x devices
 * (aspect ~1080:1400 matches prior server card).
 */
const CARD_W = 360;
const CARD_H = Math.round((CARD_W * 1400) / 1080);
const OUTER_PAD = 12;
const INNER_H = CARD_H - OUTER_PAD * 2;
const HEADER_H = Math.round(INNER_H * 0.26);
const AVATAR = 104;
const AVATAR_HALF = AVATAR / 2;
const QR_SIZE = 128;

const BRAND_NAVY = "#001A5A";
const BRAND_NAVY_SOFT = "#0A3270";
const INK_PRIMARY = "#111827";
const SERVICES_GRAY = "#4B5563";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function servicesSubtitle(profile: ProviderPublicProfileDto, maxLen: number): string {
  const raw = profile.services.slice(0, 4).join(" · ").trim();
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen - 1)}…`;
}

export type ProviderShareCardCaptureViewProps = {
  profile: ProviderPublicProfileDto;
  sessionKey: number;
  isRTL: boolean;
  newOnPetOwnerLabel: string;
  reviewsWord: string;
  onReady: () => void;
};

/**
 * Off-screen share card for `captureRef`. Uses SVG QR so ViewShot reliably captures pixels.
 */
export const ProviderShareCardCaptureView = forwardRef<View, ProviderShareCardCaptureViewProps>(
  function ProviderShareCardCaptureView(
    { profile, sessionKey, isRTL, newOnPetOwnerLabel, reviewsWord, onReady },
    ref,
  ) {
    const [imgFailed, setImgFailed] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(!profile.profileImageUrl);
    const signaled = useRef(false);

    const publicUrl = useMemo(
      () => publicProviderProfileUrl(profile.providerId),
      [profile.providerId],
    );

    useEffect(() => {
      signaled.current = false;
      setImgFailed(false);
      setImgLoaded(!profile.profileImageUrl);
    }, [sessionKey, profile.profileImageUrl, profile.providerId]);

    const avatarDone = !profile.profileImageUrl || imgLoaded || imgFailed;

    useEffect(() => {
      if (!avatarDone || signaled.current) return;
      signaled.current = true;
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => onReady()),
      );
      return () => cancelAnimationFrame(id);
    }, [avatarDone, onReady]);

    const servicesLine = servicesSubtitle(profile, 78);
    const displayName = (profile.name ?? "Provider").trim() || "Provider";
    const initials = initialsFromName(displayName);
    const hasRating = profile.averageRating != null;

    const rtlText = isRTL ? ({ writingDirection: "rtl" as const } as const) : undefined;

    const ratingDisplay = hasRating
      ? `⭐ ${profile.averageRating!.toFixed(1)}${
          profile.reviewCount > 0 ? ` (${profile.reviewCount} ${reviewsWord})` : ""
        }`
      : "";

    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.outer}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.cardFrame}>
          <LinearGradient
            colors={[BRAND_NAVY, BRAND_NAVY_SOFT]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.headerBand, { height: HEADER_H }]}
          />

          <View style={styles.bodyBand}>
            <View style={[styles.avatarRow, { marginTop: -AVATAR_HALF + 6 }]}>
              <View collapsable={false} style={styles.avatarShadowPlate}>
                <View style={styles.avatarRing}>
                  {profile.profileImageUrl && !imgFailed ? (
                    <Image
                      source={{ uri: profile.profileImageUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                      onLoad={() => setImgLoaded(true)}
                      onError={() => {
                        setImgFailed(true);
                        setImgLoaded(true);
                      }}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{initials}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.textBlock}>
              <Text style={[styles.name, rtlText]} numberOfLines={2}>
                {displayName}
              </Text>

              {hasRating ? (
                <Text style={[styles.ratingLine, rtlText]} numberOfLines={2}>
                  {ratingDisplay}
                </Text>
              ) : (
                <View style={styles.newBadge}>
                  <Text style={[styles.newBadgeText, rtlText]}>{newOnPetOwnerLabel}</Text>
                </View>
              )}

              {!!servicesLine && (
                <Text style={[styles.services, rtlText]} numberOfLines={2}>
                  {servicesLine}
                </Text>
              )}
            </View>

            <View style={styles.footerSpacer} />

            <View style={styles.footer}>
              <View collapsable={false} style={styles.qrPlate}>
                <QRCode
                  value={publicUrl}
                  size={QR_SIZE}
                  color={BRAND_NAVY}
                  backgroundColor="#FFFFFF"
                  quietZone={6}
                  ecl="Q"
                />
              </View>
              <Text style={[styles.domain, rtlText]}>petowner.app</Text>
            </View>
          </View>
        </View>
      </View>
    );
  },
);

const avatarShadowIos = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  default: {},
});

const styles = StyleSheet.create({
  outer: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: BRAND_NAVY,
    padding: OUTER_PAD,
    borderRadius: 0,
  },
  cardFrame: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  headerBand: {
    width: "100%",
  },
  bodyBand: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: 0,
  },
  avatarRow: {
    width: "100%",
    alignItems: "center",
    zIndex: 4,
  },
  avatarShadowPlate: {
    borderRadius: (AVATAR + 16) / 2,
    ...avatarShadowIos,
    elevation: Platform.OS === "android" ? 12 : 0,
  },
  avatarRing: {
    width: AVATAR + 8,
    height: AVATAR + 8,
    padding: 4,
    borderRadius: (AVATAR + 8) / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR_HALF,
  },
  avatarFallback: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR_HALF,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38BDF8",
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: "800",
    color: BRAND_NAVY,
    letterSpacing: -1,
  },
  textBlock: {
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  name: {
    width: "100%",
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: INK_PRIMARY,
    letterSpacing: Platform.OS === "ios" ? -0.8 : -0.3,
    lineHeight: 32,
  },
  ratingLine: {
    marginTop: 10,
    width: "100%",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 22,
  },
  newBadge: {
    marginTop: 12,
    maxWidth: "100%",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignSelf: "center",
  },
  newBadgeText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#1E3A8A",
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  services: {
    marginTop: 14,
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: SERVICES_GRAY,
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  footerSpacer: {
    flex: 1,
    minHeight: 8,
  },
  footer: {
    alignItems: "center",
    width: "100%",
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  qrPlate: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  domain: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.35,
  },
});
