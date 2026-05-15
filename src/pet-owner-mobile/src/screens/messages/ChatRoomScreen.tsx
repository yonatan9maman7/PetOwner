import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  BackHandler,
  Keyboard,
  Platform,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { sendMessage } from "../../services/signalr";
import { useTranslation } from "../../i18n";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import type { ChatMessageDto } from "../../types/api";

const READ_RECEIPT_BLUE = "#34B7F1";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameCalendarDay(aIso: string, bIso: string): boolean {
  return sameLocalCalendarDay(new Date(aIso), new Date(bIso));
}

/** Hebrew labels: היום / אתמול / DD/MM/YYYY (local calendar). */
function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (sameLocalCalendarDay(d, now)) {
    return "היום";
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameLocalCalendarDay(d, yesterday)) {
    return "אתמול";
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function ChatRoomScreen() {
  const { t, rtlText, rtlInput, isRTL } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { otherUserId, otherUserName } = route.params as {
    otherUserId: string;
    otherUserName: string;
  };

  const currentUserId = useAuthStore((s) => s.userId);
  const activeMessages = useChatStore((s) => s.activeMessages);
  const [text, setText] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  /** Stack `headerShown: false` → usually 0; custom header sits outside KAV. */
  const keyboardVerticalOffset = Platform.OS === "ios" ? headerHeight : 0;
  /** Strip bottom safe inset while the keyboard is up (iOS) so KAV + safe area do not double-pad. */
  const inputContainerPaddingBottom =
    Platform.OS === "ios" && isKeyboardVisible ? 0 : insets.bottom;
  const listRef = useRef<FlatList>(null);

  const handleBack = useCallback(() => {
    const routes = navigation.getState()?.routes;
    if (routes && routes.length > 1) {
      navigation.goBack();
    } else {
      navigation.navigate("MessagesMain");
    }
  }, [navigation]);

  useEffect(() => {
    useChatStore.getState().setActiveChat(otherUserId);
    useChatStore.getState().fetchMessages(otherUserId);
    useChatStore.getState().markAsRead(otherUserId);

    return () => {
      useChatStore.getState().setActiveChat(null);
    };
  }, [otherUserId]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isKeyboardVisible) {
        Keyboard.dismiss();
        return true;
      }
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack, isKeyboardVisible]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    try {
      await sendMessage(otherUserId, content);
    } catch {
      setText(content);
      showGlobalAlertCompat(t("genericErrorTitle"), t("genericErrorDesc"));
    }
  };

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessageDto;
    index: number;
  }) => {
    const isSent = item.senderId === currentUserId;
    // `activeMessages` is oldest → newest; show a pill on the first loaded row or when the day changes vs older neighbor.
    const showDateSeparator =
      index === 0 ||
      !isSameCalendarDay(item.sentAt, activeMessages[index - 1]!.sentAt);

    const mutedOnPrimary = isSent ? "rgba(255,255,255,0.65)" : colors.textMuted;

    return (
      <View
        style={{
          paddingHorizontal: 16,
          marginBottom: 8,
          alignItems: isSent ? "flex-end" : "flex-start",
        }}
      >
        {showDateSeparator ? (
          <View
            style={{
              width: "100%",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: isSent ? "rgba(52, 183, 241, 0.12)" : "rgba(100, 116, 139, 0.14)",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: colors.textMuted,
                }}
              >
                {formatDateSeparator(item.sentAt)}
              </Text>
            </View>
          </View>
        ) : null}

        <View
          style={{
            maxWidth: "75%",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 8,
            borderBottomRightRadius: isSent ? 4 : 16,
            borderBottomLeftRadius: isSent ? 16 : 4,
            backgroundColor: isSent ? colors.primary : colors.surfaceSecondary,
          }}
        >
          <Text
            style={[
              rtlText,
              {
                fontSize: 15,
                lineHeight: 20,
                color: isSent ? colors.textInverse : colors.text,
              },
            ]}
          >
            {item.content}
          </Text>

          {isSent ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-end",
                marginTop: 4,
                gap: 4,
              }}
            >
              {/* Same child order for LTR/RTL: RN mirrors row in RTL so receipt sits visually left of time. */}
              <Text style={{ fontSize: 11, color: mutedOnPrimary }}>
                {formatTime(item.sentAt)}
              </Text>
              <Ionicons
                name={item.isRead ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.isRead ? READ_RECEIPT_BLUE : mutedOnPrimary}
              />
            </View>
          ) : (
            <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
              <Text style={{ fontSize: 11, color: mutedOnPrimary }}>
                {formatTime(item.sentAt)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }}>
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View
          style={{
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            backgroundColor: colors.surface,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
            }}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginLeft: 8 }}>
            {otherUserName}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={activeMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexDirection: "column-reverse",
            paddingVertical: 12,
          }}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            paddingBottom: inputContainerPaddingBottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 8,
              backgroundColor: colors.surface,
              gap: 8,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("typeMessage")}
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                rtlInput,
                {
                  flex: 1,
                  backgroundColor: colors.inputBg,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: colors.text,
                  maxHeight: 96,
                },
              ]}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim()}
              activeOpacity={0.7}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: text.trim() ? colors.primary : colors.textMuted,
              }}
            >
              <Ionicons
                name="send"
                size={18}
                color={colors.textInverse}
                style={{ marginLeft: isRTL ? -2 : 2 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
