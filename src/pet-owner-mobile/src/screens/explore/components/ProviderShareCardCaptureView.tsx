import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import QRCode from "qrcode";
import type { ProviderPublicProfileDto } from "../../../types/api";
import { publicProviderProfileUrl } from "../../../config/publicLinks";

/** Canvas ratio matches server share card (1080×1400). */
const CARD_W = 360;
const CARD_H = Math.round((CARD_W * 1400) / 1080);
const AVATAR = 100;
const QR_SIZE = 132;

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
 * Off-screen share card for `captureRef`. Signals `onReady` once QR + avatar (if any) are ready to paint.
 */
export const ProviderShareCardCaptureView = forwardRef<View, ProviderShareCardCaptureViewProps>(
  function ProviderShareCardCaptureView(
    { profile, sessionKey, isRTL, newOnPetOwnerLabel, reviewsWord, onReady },
    ref,
  ) {
    const [qrUri, setQrUri] = useState<string | null>(null);
    const [qrFailed, setQrFailed] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(!profile.profileImageUrl);
    const signaled = useRef(false);

    const publicUrl = useMemo(
      () => publicProviderProfileUrl(profile.providerId),
      [profile.providerId],
    );

    useEffect(() => {
      signaled.current = false;
      setQrUri(null);
      setQrFailed(false);
      setImgFailed(false);
      setImgLoaded(!profile.profileImageUrl);
    }, [sessionKey, profile.profileImageUrl, profile.providerId]);

    useEffect(() => {
      let cancelled = false;
      QRCode.toDataURL(publicUrl, {
        margin: 1,
        width: 240,
        color: { dark: "#001A5AFF", light: "#FFFFFFFF" },
      })
        .then((uri) => {
          if (!cancelled) setQrUri(uri);
        })
        .catch(() => {
          if (!cancelled) {
            setQrFailed(true);
            setQrUri(null);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [publicUrl, sessionKey]);

    const qrDone = qrUri !== null || qrFailed;
    const avatarDone = !profile.profileImageUrl || imgLoaded || imgFailed;

    useEffect(() => {
      if (!qrDone || !avatarDone || signaled.current) return;
      signaled.current = true;
      const id = requestAnimationFrame(() => onReady());
      return () => cancelAnimationFrame(id);
    }, [qrDone, avatarDone, onReady]);

    const ratingLine =
      profile.averageRating != null
        ? `⭐ ${profile.averageRating.toFixed(1)}${
            profile.reviewCount > 0 ? `  ·  ${profile.reviewCount} ${reviewsWord}` : ""
          }`
        : newOnPetOwnerLabel;

    const servicesLine = servicesSubtitle(profile, 72);
    const displayName = (profile.name ?? "Provider").trim() || "Provider";
    const initials = initialsFromName(displayName);

    const rtlText = isRTL ? ({ writingDirection: "rtl" as const } as const) : undefined;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.outer}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.inner}>
          <View style={styles.topSection}>
            <View style={styles.avatarWrap}>
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

            <Text style={[styles.name, rtlText]} numberOfLines={2}>
              {displayName}
            </Text>

            <Text style={[styles.rating, rtlText]} numberOfLines={1}>
              {ratingLine}
            </Text>

            {!!servicesLine && (
              <Text style={[styles.services, rtlText]} numberOfLines={2}>
                {servicesLine}
              </Text>
            )}
          </View>

          <View style={styles.footer}>
            {qrUri ? (
              <Image source={{ uri: qrUri }} style={styles.qr} resizeMode="contain" />
            ) : (
              <View style={[styles.qr, styles.qrPlaceholder]} />
            )}
            <Text style={styles.domain}>petowner.app</Text>
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  outer: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: "#001A5A",
    padding: 12,
    borderRadius: 0,
  },
  inner: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    justifyContent: "space-between",
  },
  topSection: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: "hidden",
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
  },
  avatarFallbackText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#001A5A",
    letterSpacing: -0.5,
  },
  name: {
    width: "100%",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: "#001A5A",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  rating: {
    marginTop: 10,
    width: "100%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 20,
  },
  services: {
    marginTop: 8,
    width: "100%",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#0EA5E9",
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    width: "100%",
    paddingTop: 8,
  },
  qr: {
    width: QR_SIZE,
    height: QR_SIZE,
  },
  qrPlaceholder: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
  },
  domain: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 0.3,
  },
});
