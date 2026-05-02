import { useMemo, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TranslationKey } from "../../../i18n";
import { useTheme } from "../../../theme/ThemeContext";
import type { PostDto, CommunityGroupDto, PlaydateEventDto } from "../../../types/api";

type TFn = (key: TranslationKey) => string;

export interface DogParkLite {
  id: string;
  name: string;
}

export interface CommunitySearchModalProps {
  visible: boolean;
  onClose: () => void;
  t: TFn;
  rtlText: { textAlign: "left" | "right"; writingDirection: "ltr" | "rtl" };
  rtlInput: { textAlign: "left" | "right"; writingDirection: "ltr" | "rtl" };
  rowDirection: "row" | "row-reverse";
  query: string;
  onQueryChange: (q: string) => void;
  posts: PostDto[];
  groups: CommunityGroupDto[];
  meetups: PlaydateEventDto[];
  parks: DogParkLite[];
  loading?: boolean;
}

function Section({
  title,
  children,
  colors,
  rtlText,
}: {
  title: string;
  children: ReactNode;
  colors: ReturnType<typeof useTheme>["colors"];
  rtlText: CommunitySearchModalProps["rtlText"];
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[{ fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 8 }, rtlText]}>{title}</Text>
      {children}
    </View>
  );
}

export function CommunitySearchModal({
  visible,
  onClose,
  t,
  rtlText,
  rtlInput,
  rowDirection,
  query,
  onQueryChange,
  posts,
  groups,
  meetups,
  parks,
  loading,
}: CommunitySearchModalProps) {
  const { colors } = useTheme();
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) {
      return { posts: [] as PostDto[], groups: [] as CommunityGroupDto[], meetups: [] as PlaydateEventDto[], parks: [] as DogParkLite[] };
    }
    return {
      posts: posts.filter((p) => `${p.content} ${p.userName}`.toLowerCase().includes(q)).slice(0, 8),
      groups: groups.filter((g) => `${g.name} ${g.description ?? ""}`.toLowerCase().includes(q)).slice(0, 8),
      meetups: meetups.filter((e) => `${e.title} ${e.locationName}`.toLowerCase().includes(q)).slice(0, 8),
      parks: parks.filter((p) => `${p.name}`.toLowerCase().includes(q)).slice(0, 8),
    };
  }, [q, posts, groups, meetups, parks]);

  const hasAny = filtered.posts.length + filtered.groups.length + filtered.meetups.length + filtered.parks.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 8 }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 8 }}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={[{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.text }, rtlText]}>{t("cm_search_title")}</Text>
        </View>
        <View
          style={{
            flexDirection: rowDirection,
            alignItems: "center",
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 12,
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: colors.borderLight,
            gap: 8,
          }}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[{ flex: 1, paddingVertical: 12, fontSize: 15, color: colors.text }, rtlInput]}
            value={query}
            onChangeText={onQueryChange}
            placeholder={t("cm_search_placeholder")}
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {loading ? (
            <ActivityIndicator color={colors.text} style={{ marginVertical: 12 }} />
          ) : null}
          {!q ? (
            <Text style={[{ color: colors.textMuted, marginTop: 8 }, rtlText]}>{t("cm_search_placeholder")}</Text>
          ) : !hasAny && !loading ? (
            <Text style={[{ color: colors.textMuted, marginTop: 8 }, rtlText]}>{t("cm_search_no_results")}</Text>
          ) : hasAny ? (
            <>
              {filtered.posts.length > 0 ? (
                <Section title={t("cm_search_posts")} colors={colors} rtlText={rtlText}>
                  {filtered.posts.map((p) => (
                    <Text key={p.id} style={[{ color: colors.text, marginBottom: 6 }, rtlText]} numberOfLines={2}>
                      {p.userName}: {p.content}
                    </Text>
                  ))}
                </Section>
              ) : null}
              {filtered.groups.length > 0 ? (
                <Section title={t("cm_search_groups")} colors={colors} rtlText={rtlText}>
                  {filtered.groups.map((g) => (
                    <Text key={g.id} style={[{ color: colors.text, marginBottom: 6 }, rtlText]} numberOfLines={2}>
                      {g.name}
                    </Text>
                  ))}
                </Section>
              ) : null}
              {filtered.meetups.length > 0 ? (
                <Section title={t("cm_search_meetups")} colors={colors} rtlText={rtlText}>
                  {filtered.meetups.map((e) => (
                    <Text key={e.id} style={[{ color: colors.text, marginBottom: 6 }, rtlText]} numberOfLines={2}>
                      {e.title} · {e.locationName}
                    </Text>
                  ))}
                </Section>
              ) : null}
              {filtered.parks.length > 0 ? (
                <Section title={t("cm_search_parks")} colors={colors} rtlText={rtlText}>
                  {filtered.parks.map((p) => (
                    <Text key={p.id} style={[{ color: colors.text, marginBottom: 6 }, rtlText]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  ))}
                </Section>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
