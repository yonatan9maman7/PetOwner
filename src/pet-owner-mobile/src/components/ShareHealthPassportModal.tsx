import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "qrcode";
import { SvgXml } from "react-native-svg";
import { petHealthApi } from "../api/client";
import { useTranslation } from "../i18n";
import { useTheme } from "../theme/ThemeContext";
import type { HealthPassportShareDto } from "../types/api";

interface Props {
  petId: string;
  visible: boolean;
  onClose: () => void;
}

export function ShareHealthPassportModal({ petId, visible, onClose }: Props) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [data, setData] = useState<HealthPassportShareDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setData(null);
      setError(null);
      setCopied(false);
      setQrSvg(null);
      return;
    }
    setLoading(true);
    petHealthApi
      .createShareLink(petId)
      .then(async (shareData) => {
        setData(shareData);
        const svg = await QRCode.toString(shareData.url, { type: "svg", width: 200, margin: 1 });
        setQrSvg(svg);
      })
      .catch(() => setError(t("genericError")))
      .finally(() => setLoading(false));
  }, [visible, petId]);

  const handleCopy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data) return;
    await Share.share({ message: data.url, url: data.url });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={{ position: "absolute", top: 16, right: 16, zIndex: 1 }}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {t("shareWithVet")}
          </Text>

          {loading && (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {error && (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Ionicons name="alert-circle" size={40} color="#ef4444" />
              <Text style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>{error}</Text>
            </View>
          )}

          {data && !loading && (
            <View style={{ alignItems: "center", gap: 16 }}>
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 16,
                  borderRadius: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {qrSvg && <SvgXml xml={qrSvg} width={200} height={200} />}
              </View>

              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  textAlign: "center",
                  paddingHorizontal: 20,
                }}
                numberOfLines={2}
                selectable
              >
                {data.url}
              </Text>

              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, width: "100%" }}>
                <Pressable
                  onPress={handleCopy}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: copied ? "#dcfce7" : colors.surfaceSecondary,
                  }}
                >
                  <Ionicons
                    name={copied ? "checkmark-circle" : "copy-outline"}
                    size={18}
                    color={copied ? "#16a34a" : colors.text}
                  />
                  <Text style={{ fontWeight: "600", color: copied ? "#16a34a" : colors.text, fontSize: 14 }}>
                    {copied ? t("linkCopied") : t("copyLink")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 14,
                    borderRadius: 14,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <Text style={{ fontWeight: "600", color: "#fff", fontSize: 14 }}>
                    {t("share")}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
                {t("shareExpires")}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
