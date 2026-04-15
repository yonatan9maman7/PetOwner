import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation, type TranslationKey } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";

/** Kept in sync with app.json / Account settings footer */
const APP_VERSION = "1.0.0";

const FAQ_SECTIONS: {
  category: TranslationKey;
  items: { q: TranslationKey; a: TranslationKey }[];
}[] = [
  {
    category: "helpCatGettingStarted",
    items: [
      { q: "helpFaqGs1Q", a: "helpFaqGs1A" },
      { q: "helpFaqGs2Q", a: "helpFaqGs2A" },
      { q: "helpFaqGs3Q", a: "helpFaqGs3A" },
    ],
  },
  {
    category: "helpCatPetsHealth",
    items: [
      { q: "helpFaqPh1Q", a: "helpFaqPh1A" },
      { q: "helpFaqPh2Q", a: "helpFaqPh2A" },
      { q: "helpFaqPh3Q", a: "helpFaqPh3A" },
    ],
  },
  {
    category: "helpCatBookingsProviders",
    items: [
      { q: "helpFaqBk1Q", a: "helpFaqBk1A" },
      { q: "helpFaqBk2Q", a: "helpFaqBk2A" },
      { q: "helpFaqBk3Q", a: "helpFaqBk3A" },
    ],
  },
  {
    category: "helpCatMessagesNotifications",
    items: [
      { q: "helpFaqMsg1Q", a: "helpFaqMsg1A" },
      { q: "helpFaqMsg2Q", a: "helpFaqMsg2A" },
    ],
  },
  {
    category: "helpCatSafetyEmergency",
    items: [
      { q: "helpFaqSafe1Q", a: "helpFaqSafe1A" },
      { q: "helpFaqSafe2Q", a: "helpFaqSafe2A" },
      { q: "helpFaqSafe3Q", a: "helpFaqSafe3A" },
    ],
  },
  {
    category: "helpCatAccountSecurity",
    items: [
      { q: "helpFaqAcct1Q", a: "helpFaqAcct1A" },
      { q: "helpFaqAcct2Q", a: "helpFaqAcct2A" },
    ],
  },
];

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

function FaqDivider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        marginHorizontal: 18,
      }}
    />
  );
}

interface QuickRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  iconColor?: string;
  iconBg?: string;
}

function QuickRow({
  icon,
  label,
  subtitle,
  onPress,
  iconColor,
  iconBg,
}: QuickRowProps) {
  const { isRTL } = useTranslation();
  const { colors } = useTheme();
  const chevron = isRTL ? "chevron-back" : "chevron-forward";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={{
        flexDirection: isRTL ? "row-reverse" : "row",
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

function FaqItem({
  questionKey,
  answerKey,
  isOpen,
  onToggle,
  isLast,
}: {
  questionKey: TranslationKey;
  answerKey: TranslationKey;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();

  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.65}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "flex-start",
          paddingVertical: 14,
          paddingHorizontal: 18,
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
              lineHeight: 21,
            }}
          >
            {t(questionKey)}
          </Text>
          {isOpen ? (
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 10,
                lineHeight: 21,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t(answerKey)}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
          style={{ marginTop: 2 }}
        />
      </TouchableOpacity>
      {!isLast ? <FaqDivider /> : null}
    </View>
  );
}

export function HelpCenterScreen() {
  const navigation = useNavigation<any>();
  const { t, isRTL } = useTranslation();
  const { colors } = useTheme();
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: isRTL ? "row-reverse" : "row",
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
          {t("helpCenterTitle")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >

        <View style={{ marginBottom: 24 }}>
          <GroupHeader label={t("helpCenterBrowseFaqs")} />
          {FAQ_SECTIONS.map((section, sIdx) => (
            <View key={section.category} style={{ marginBottom: 16 }}>
              <GroupHeader label={t(section.category)} />
              <GroupCard>
                {section.items.map((item, iIdx) => {
                  const id = `${sIdx}-${iIdx}`;
                  const isLast = iIdx === section.items.length - 1;
                  return (
                    <FaqItem
                      key={id}
                      questionKey={item.q}
                      answerKey={item.a}
                      isOpen={openFaqId === id}
                      onToggle={() => toggleFaq(id)}
                      isLast={isLast}
                    />
                  );
                })}
              </GroupCard>
            </View>
          ))}
        </View>

        <View style={{ marginBottom: 24 }}>
          <GroupHeader label={t("helpCenterLegalInfo")} />
          <GroupCard>
            <QuickRow
              icon="document-text-outline"
              label={t("termsOfService")}
              onPress={() => navigation.navigate("Terms")}
              iconColor="#64748b"
              iconBg={colors.iconSlateBg}
            />
            <RowDivider isRTL={isRTL} />
            <QuickRow
              icon="shield-checkmark-outline"
              label={t("privacyPolicy")}
              onPress={() => navigation.navigate("Privacy")}
              iconColor="#7c3aed"
              iconBg={colors.iconPurpleBg}
            />
          </GroupCard>
        </View>

        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: colors.textMuted,
            marginTop: 8,
          }}
        >
          PetOwner {t("helpCenterAppVersion")} {APP_VERSION}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
