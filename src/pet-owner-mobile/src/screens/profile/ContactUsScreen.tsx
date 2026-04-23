import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { supportApi } from "../../api/client";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "../../config/support";

const MIN_MESSAGE_LENGTH = 10;
const MAILTO_SAFE_LENGTH = 1800;
/** Keep in sync with app.json and AccountSettingsScreen footer */
const APP_VERSION = "1.0.0";

type TopicId = "general" | "account" | "bug" | "billing";

const TOPICS: TopicId[] = ["general", "account", "bug", "billing"];

function showNotice(message: string) {
  if (Platform.OS === "web") {
    window.alert(message);
    return;
  }
  Alert.alert("", message);
}

function GroupHeader({ label }: { label: string }) {
  const { isRTL } = useTranslation();
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: colors.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 10,
        paddingHorizontal: 4,
        textAlign: isRTL ? "right" : "left",
      }}
    >
      {label}
    </Text>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      {children}
    </View>
  );
}

function RowDivider({ isRTL }: { isRTL: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginLeft: isRTL ? 0 : 68,
        marginRight: isRTL ? 68 : 0,
      }}
    />
  );
}

interface ContactRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
}

function ContactRow({
  icon,
  label,
  subtitle,
  onPress,
  iconColor,
  iconBg,
}: ContactRowProps) {
  const { isRTL } = useTranslation();
  const { colors } = useTheme();
  const chevron = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: rowDirectionForAppLayout(isRTL),
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 18,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          marginLeft: isRTL ? 12 : 0,
          marginRight: isRTL ? 0 : 12,
          backgroundColor: iconBg ?? colors.iconTealBg,
        }}
      >
        <Ionicons name={icon} size={19} color={iconColor ?? colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12.5,
              color: colors.textSecondary,
              marginTop: 1,
              textAlign: isRTL ? "right" : "left",
              lineHeight: 17,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name={chevron} size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ContactUsScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL, rtlInput } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [topic, setTopic] = useState<TopicId>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const topicLabels: Record<TopicId, string> = {
    general: t("contactUsTopicGeneral"),
    account: t("contactUsTopicAccount"),
    bug: t("contactUsTopicBug"),
    billing: t("contactUsTopicBilling"),
  };

  const buildBody = (topicId: TopicId, msg: string) => {
    const lines = [
      `${t("contactUsTopicLabel")}: ${topicLabels[topicId]}`,
      "",
      `${t("contactUsMessageLabel")}:`,
      msg.trim(),
      "",
      "---",
      `PetOwner ${APP_VERSION}`,
      `${Platform.OS} ${String(Platform.Version ?? "")}`.trim(),
    ];
    if (user?.name || user?.email) {
      lines.push(
        user.name && user.email
          ? `${user.name} <${user.email}>`
          : user.email || user.name || ""
      );
    }
    return lines.filter(Boolean).join("\n");
  };

  const resolveMailSubject = (topicId: TopicId) => {
    const sub = subject.trim();
    if (sub.length > 0) {
      return `[PetOwner] ${topicLabels[topicId]} — ${sub}`;
    }
    return `[PetOwner] ${topicLabels[topicId]}`;
  };

  const copyEmail = async () => {
    await Clipboard.setStringAsync(SUPPORT_EMAIL);
    showNotice(t("contactUsEmailCopied"));
  };

  const handleOpenMail = async () => {
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      showNotice(t("contactUsMessageTooShort").replace("{min}", String(MIN_MESSAGE_LENGTH)));
      return;
    }
    const sub = resolveMailSubject(topic);
    const body = buildBody(topic, trimmed);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;
    if (url.length > MAILTO_SAFE_LENGTH) {
      const full = `To: ${SUPPORT_EMAIL}\nSubject: ${sub}\n\n${body}`;
      await Clipboard.setStringAsync(full);
      showNotice(t("contactUsFullMessageCopied"));
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      const full = `To: ${SUPPORT_EMAIL}\nSubject: ${sub}\n\n${body}`;
      await Clipboard.setStringAsync(full);
      showNotice(`${t("contactUsMailOpenFailed")} ${t("contactUsFullMessageCopied")}`);
    }
  };

  const handleCopyFullMessage = async () => {
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      showNotice(t("contactUsMessageTooShort").replace("{min}", String(MIN_MESSAGE_LENGTH)));
      return;
    }
    const sub = resolveMailSubject(topic);
    const body = buildBody(topic, trimmed);
    const full = `To: ${SUPPORT_EMAIL}\nSubject: ${sub}\n\n${body}`;
    await Clipboard.setStringAsync(full);
    showNotice(t("contactUsFullMessageCopied"));
  };

  const openMailtoSimple = async () => {
    const url = `mailto:${SUPPORT_EMAIL}`;
    try {
      await Linking.openURL(url);
    } catch {
      await copyEmail();
    }
  };

  const openTel = () => {
    if (!SUPPORT_PHONE) return;
    const digits = SUPPORT_PHONE.replace(/[^\d+]/g, "");
    void Linking.openURL(`tel:${digits}`);
  };

  const handleSubmitToTeam = async () => {
    const trimmed = message.trim();
    if (trimmed.length < MIN_MESSAGE_LENGTH) {
      showNotice(t("contactUsMessageTooShort").replace("{min}", String(MIN_MESSAGE_LENGTH)));
      return;
    }
    setSending(true);
    try {
      await supportApi.submitInquiry({
        topic,
        subject: subject.trim() || undefined,
        message: trimmed,
        appVersion: APP_VERSION,
        platform: Platform.OS,
      });
      showNotice(t("contactUsSendSuccess"));
      setMessage("");
      setSubject("");
      setTopic("general");
    } catch {
      showNotice(t("contactUsSendError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ padding: 4 }}
        >
          <Ionicons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
          }}
        >
          {t("contactUsTitle")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 22 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
              marginBottom: 8,
            }}
          >
            {t("contactUsHeroTitle")}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              lineHeight: 21,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {t("contactUsHeroSubtitle")}
          </Text>
        </View>

        <View style={{ marginBottom: 24 }}>
          <GroupHeader label={t("contactUsQuickContact")} />
          <GroupCard>
            <ContactRow
              icon="mail-outline"
              label={t("contactUsEmailSupport")}
              subtitle={SUPPORT_EMAIL}
              onPress={() => void openMailtoSimple()}
              iconColor="#0d9488"
              iconBg={colors.iconTealBg}
            />
            {SUPPORT_PHONE ? (
              <>
                <RowDivider isRTL={isRTL} />
                <ContactRow
                  icon="call-outline"
                  label={t("contactUsPhoneSupport")}
                  subtitle={SUPPORT_PHONE}
                  onPress={openTel}
                  iconColor="#059669"
                  iconBg={colors.iconGreenBg}
                />
              </>
            ) : null}
            <RowDivider isRTL={isRTL} />
            <ContactRow
              icon="copy-outline"
              label={t("contactUsCopyEmail")}
              onPress={() => void copyEmail()}
              iconColor="#0284c7"
              iconBg={colors.iconSkyBg}
            />
          </GroupCard>
        </View>

        <View style={{ marginBottom: 24 }}>
          <GroupHeader label={t("contactUsMessageSection")} />
          <GroupCard>
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textMuted,
                  marginBottom: 10,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("contactUsTopicLabel")}
              </Text>
              <View
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {TOPICS.map((id) => {
                  const active = topic === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setTopic(id)}
                      activeOpacity={0.7}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 20,
                        backgroundColor: active ? colors.primary : colors.surfaceSecondary,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: active ? colors.primaryText : colors.text,
                        }}
                      >
                        {topicLabels[id]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <RowDivider isRTL={isRTL} />

            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textMuted,
                  marginBottom: 8,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("contactUsSubjectLabel")}
              </Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder={t("contactUsSubjectPlaceholder")}
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.inputBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.text,
                  ...rtlInput,
                }}
              />
            </View>

            <RowDivider isRTL={isRTL} />

            <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.textMuted,
                  marginBottom: 8,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("contactUsMessageLabel")}
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t("contactUsMessagePlaceholder")}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 120,
                  backgroundColor: colors.inputBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: colors.text,
                  ...rtlInput,
                }}
              />
            </View>

            <View style={{ paddingHorizontal: 16, paddingBottom: 18, gap: 10 }}>
              {isLoggedIn ? (
                <TouchableOpacity
                  onPress={() => void handleSubmitToTeam()}
                  activeOpacity={0.85}
                  disabled={sending}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: "center",
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={colors.primaryText} />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primaryText }}>
                      {t("contactUsSendToTeam")}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textMuted,
                    textAlign: "center",
                    paddingVertical: 4,
                  }}
                >
                  {t("contactUsLoginRequired")}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => void handleOpenMail()}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {t("contactUsOpenInMail")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleCopyFullMessage()}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {t("contactUsCopyFullMessage")}
                </Text>
              </TouchableOpacity>
            </View>
          </GroupCard>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("HelpCenter")}
          activeOpacity={0.7}
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 12,
          }}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.primary }}>
            {t("contactUsBrowseHelp")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
