import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { showGlobalAlertCompat } from "../../components/global-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
  manipulateAsync,
  SaveFormat,
  type Action,
} from "expo-image-manipulator";
import * as Location from "expo-location";
import { useTranslation, rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import { useKeyboardAvoidingState } from "../../hooks/useKeyboardAvoidingState";
import { triageApi, petsApi } from "../../api/client";
import { getSpeciesEmoji } from "./MyPets/constants";
import { PetSpecies } from "../../types/api";
import { pickImageWithSource } from "../../utils/imagePicker";
import type {
  PetDto,
  TeletriageResponseDto,
  TeletriageHistoryDto,
  NearbyVetDto,
  TriageSeverity,
} from "../../types/api";

/** Keeps Base64 small for mobile networks while staying sharp enough for triage. */
const TRIAGE_IMAGE_MAX_EDGE = 1024;
const TRIAGE_IMAGE_QUALITY = 0.45;

const TRIAGE_IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: TRIAGE_IMAGE_QUALITY,
  base64: false,
};

async function prepareTriageImageForUpload(
  localUri: string,
): Promise<{ uri: string; base64: string }> {
  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      Image.getSize(
        localUri,
        (w, h) => resolve({ width: w, height: h }),
        reject,
      );
    },
  );

  const actions: Action[] = [];
  if (width >= height) {
    if (width > TRIAGE_IMAGE_MAX_EDGE) {
      actions.push({ resize: { width: TRIAGE_IMAGE_MAX_EDGE } });
    }
  } else if (height > TRIAGE_IMAGE_MAX_EDGE) {
    actions.push({ resize: { height: TRIAGE_IMAGE_MAX_EDGE } });
  }

  const result = await manipulateAsync(localUri, actions, {
    compress: TRIAGE_IMAGE_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error("Missing base64 in manipulate result");
  }
  return { uri: result.uri, base64: result.base64 };
}

const SEVERITY_COLOR: Record<TriageSeverity, string> = {
  Low: "#10b981",
  Medium: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
};

/* ──────── Chat message types ──────── */

interface UserMessage {
  role: "user";
  text: string;
  imageUri?: string;
  timestamp: Date;
}

interface AssistantMessage {
  role: "assistant";
  assessment: TeletriageResponseDto;
  timestamp: Date;
}

type ChatMessage = UserMessage | AssistantMessage;

/* ──────── Main component ──────── */

export function TriageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { t, isRTL, rtlText, rtlRow, rtlInput, alignCls, isHebrew } =
    useTranslation();
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const { behavior: keyboardAvoidBehavior } = useKeyboardAvoidingState();

  const [pets, setPets] = useState<PetDto[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  /* Chat state */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [symptomInput, setSymptomInput] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [triageImageProcessing, setTriageImageProcessing] = useState(false);
  const [assessing, setAssessing] = useState(false);

  /* Nearby vets */
  const [nearbyVets, setNearbyVets] = useState<NearbyVetDto[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [sosEmergencyMode, setSosEmergencyMode] = useState(false);

  /* History state */
  const [allHistory, setAllHistory] = useState<
    (TeletriageHistoryDto & { petName?: string })[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null,
  );

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  /* ─── Load pets ─── */

  useEffect(() => {
    setPetsLoading(true);
    petsApi
      .getMyPets()
      .then((data) => {
        setPets(data);
        if (data.length === 1) setSelectedPetId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setPetsLoading(false));
  }, []);

  /* ─── Request location silently ─── */

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          });
        }
      } catch {}
    })();
  }, []);

  /* ─── Load all-pets history ─── */

  const loadAllHistory = useCallback(async () => {
    if (pets.length === 0) return;
    setHistoryLoading(true);
    try {
      const results = await Promise.all(
        pets.map((pet) =>
          triageApi
            .getHistory(pet.id)
            .then((items) =>
              items.map((h) => ({ ...h, petName: pet.name })),
            )
            .catch(() => [] as (TeletriageHistoryDto & { petName?: string })[]),
        ),
      );
      const merged = results
        .flat()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      setAllHistory(merged);
    } catch {
      setAllHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [pets]);

  useEffect(() => {
    if (showHistory) loadAllHistory();
  }, [showHistory, loadAllHistory]);

  /* ─── Fetch nearby vets (after high/critical/emergency) ─── */

  const fetchNearbyVets = useCallback(
    async (severity: string, isEmergency: boolean) => {
      if (!userLocation) return;
      const shouldFetch =
        isEmergency ||
        severity === "High" ||
        severity === "Critical";
      if (!shouldFetch) return;
      setNearbyLoading(true);
      try {
        const vets = await triageApi.getNearbyVets(
          userLocation.lat,
          userLocation.lng,
          5,
        );
        setNearbyVets(vets);
      } catch {
        setNearbyVets([]);
      } finally {
        setNearbyLoading(false);
      }
    },
    [userLocation],
  );

  useFocusEffect(
    useCallback(() => {
      const urgent = route.params?.sosEmergencyVet === true;
      setSosEmergencyMode(urgent);
      if (urgent) {
        setSymptomInput((prev) =>
          prev.trim() ? prev : t("sosEmergencySymptomPrefill"),
        );
      }
      return () => setSosEmergencyMode(false);
    }, [route.params?.sosEmergencyVet, t]),
  );

  useEffect(() => {
    if (!sosEmergencyMode || !userLocation) return;
    fetchNearbyVets("High", true);
  }, [sosEmergencyMode, userLocation, fetchNearbyVets]);

  /* ─── Image: camera vs library + compress/resize ─── */

  const applyPickedAssetUri = async (assetUri: string) => {
    setTriageImageProcessing(true);
    try {
      const { uri, base64 } = await prepareTriageImageForUpload(assetUri);
      setImageUri(uri);
      setImageBase64(base64);
    } catch {
      showGlobalAlertCompat(t("errorTitle"), t("genericErrorDesc"));
    } finally {
      setTriageImageProcessing(false);
    }
  };

  const showPhotoSourcePicker = async () => {
    if (assessing || triageImageProcessing) return;
    const uri = await pickImageWithSource({
      labels: {
        camera: t("takePhoto"),
        gallery: t("chooseFromLibrary"),
        cancel: t("cancel"),
      },
      title: t("triagePhotoSourceTitle"),
      message: t("triagePhotoSourceMessage"),
      pickerOptions: TRIAGE_IMAGE_PICKER_OPTIONS,
      permissionDeniedAlert: {
        title: t("errorTitle"),
        message: t("triagePhotoPermissionDenied"),
      },
    });
    if (!uri) return;
    await applyPickedAssetUri(uri);
  };

  /* ─── Submit symptoms ─── */

  const handleSubmit = async () => {
    if (!selectedPetId || !symptomInput.trim()) return;

    const capturedImageUri = imageUri;
    const capturedImageBase64 = imageBase64;

    const userMsg: UserMessage = {
      role: "user",
      text: symptomInput.trim(),
      imageUri: capturedImageUri ?? undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSymptomInput("");
    setImageUri(null);
    setImageBase64(null);
    setAssessing(true);
    setNearbyVets([]);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const data = await triageApi.assess({
        petId: selectedPetId,
        symptoms: userMsg.text,
        imageBase64: capturedImageBase64 ?? undefined,
      });
      const assistantMsg: AssistantMessage = {
        role: "assistant",
        assessment: data,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      fetchNearbyVets(data.severity, data.isEmergency);
    } catch {
      showGlobalAlertCompat(t("errorTitle"), t("triageError"));
    } finally {
      setAssessing(false);
      setTimeout(
        () => scrollRef.current?.scrollToEnd({ animated: true }),
        200,
      );
    }
  };

  /* ─── History item click ─── */

  const openHistoryItem = (item: TeletriageHistoryDto & { petName?: string }) => {
    const pet = pets.find((p) => p.id === item.petId);
    if (pet) setSelectedPetId(pet.id);
    setMessages([
      {
        role: "user",
        text: item.symptoms,
        timestamp: new Date(item.createdAt),
      },
      {
        role: "assistant",
        assessment: {
          id: item.id,
          petId: item.petId,
          petName: item.petName ?? pet?.name ?? "",
          severity: item.severity as TriageSeverity,
          assessment: item.assessment,
          recommendations: item.recommendations ?? undefined,
          isEmergency: item.isEmergency,
          createdAt: item.createdAt,
        },
        timestamp: new Date(item.createdAt),
      },
    ]);
    setShowHistory(false);
  };

  /* ─── Maps helper ─── */

  const openInMaps = (lat: number, lng: number, name: string) => {
    const url =
      Platform.OS === "ios"
        ? `maps:?q=${encodeURIComponent(name)}&ll=${lat},${lng}`
        : `geo:${lat},${lng}?q=${encodeURIComponent(name)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`,
      ),
    );
  };

  /* ══════════════════════ RENDER ══════════════════════ */

  /* --- No pets guard --- */
  if (!petsLoading && pets.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, marginTop: -8 }} edges={["top"]}>
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 14,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={colors.text}
            />
          </Pressable>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="paw" size={40} color={colors.primary} />
          </View>
          <Text
            style={{
              ...rtlText,
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {t("triageTitle")}
          </Text>
          <Text
            style={{
              ...rtlText,
              fontSize: 14,
              color: colors.textSecondary,
              textAlign: "center",
              marginBottom: 32,
              lineHeight: 20,
            }}
          >
            {t("noPetsTriage")}
          </Text>
          <Pressable
            onPress={() =>
              navigation.navigate("MyPets", { screen: "AddPet" })
            }
            style={{
              height: 56,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 40,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {t("addPetFirst")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (petsLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, marginTop: -8 }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={keyboardAvoidBehavior}
      >
        {sosEmergencyMode && (
          <View
            style={{
              backgroundColor: "#fef2f2",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#fecaca",
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="medkit" size={20} color="#dc2626" />
            <Text
              style={[
                rtlText,
                {
                  flex: 1,
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#991b1b",
                },
              ]}
            >
              {t("sosEmergencyModeBanner")}
            </Text>
          </View>
        )}
        {/* ─── Header ─── */}
        <View
          style={{
            flexDirection: rowDirectionForAppLayout(isRTL),
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={{ marginEnd: 12 }}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={colors.text}
            />
          </Pressable>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginEnd: 10,
            }}
          >
            <Ionicons name="heart" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                ...rtlText,
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {t("triageTitle")}
            </Text>
            <Text
              style={{
                ...rtlText,
                fontSize: 11,
                color: colors.textSecondary,
              }}
            >
              {t("triageSubtitle")}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowHistory(!showHistory)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: showHistory ? colors.primary : colors.surfaceSecondary,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: showHistory ? "#fff" : colors.textSecondary,
              }}
            >
              {showHistory ? t("newAssessment") : t("triageHistory")}
            </Text>
          </Pressable>
        </View>

        {showHistory ? (
          /* ═══════════════ HISTORY VIEW ═══════════════ */
          <View style={{ flex: 1 }}>
            {historyLoading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : allHistory.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text
                  style={{
                    ...rtlText,
                    fontSize: 16,
                    color: colors.textMuted,
                    textAlign: "center",
                    marginTop: 16,
                    fontWeight: "600",
                  }}
                >
                  {t("noTriageHistory")}
                </Text>
              </View>
            ) : (
              <FlatList
                data={allHistory}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 140,
                  gap: 10,
                }}
                renderItem={({ item }) => {
                  const expanded = expandedHistoryId === item.id;
                  const sevColor =
                    SEVERITY_COLOR[item.severity as TriageSeverity] ?? "#94a3b8";
                  return (
                    <Pressable
                      onPress={() =>
                        setExpandedHistoryId(expanded ? null : item.id)
                      }
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 14,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      {/* Top row */}
                      <View
                        style={{
                          flexDirection: rowDirectionForAppLayout(isRTL),
                          alignItems: "center",
                          marginBottom: 6,
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: sevColor,
                          }}
                        />
                        <View
                          style={{
                            backgroundColor: sevColor + "20",
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: sevColor,
                            }}
                          >
                            {item.severity}
                          </Text>
                        </View>
                        {item.isEmergency && (
                          <View
                            style={{
                              backgroundColor: "#fee2e2",
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: "#ef4444",
                              }}
                            >
                              {t("emergency")}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: colors.text,
                            flex: 1,
                            textAlign: isRTL ? "right" : "left",
                          }}
                          numberOfLines={1}
                        >
                          {item.petName}
                        </Text>
                        <Text
                          style={{ fontSize: 10, color: colors.textMuted }}
                        >
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Symptoms */}
                      <Text
                        style={{
                          ...rtlText,
                          fontSize: 12,
                          color: colors.textSecondary,
                          lineHeight: 16,
                        }}
                        numberOfLines={expanded ? undefined : 2}
                      >
                        {item.symptoms}
                      </Text>

                      {/* Expanded details */}
                      {expanded && (
                        <View
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: colors.borderLight,
                            gap: 8,
                          }}
                        >
                          <Text
                            style={{
                              ...rtlText,
                              fontSize: 11,
                              fontWeight: "700",
                              color: colors.primary,
                            }}
                          >
                            {t("assessment")}
                          </Text>
                          <Text
                            style={{
                              ...rtlText,
                              fontSize: 12,
                              color: colors.textSecondary,
                              lineHeight: 16,
                            }}
                          >
                            {item.assessment}
                          </Text>
                          {item.recommendations && (
                            <>
                              <Text
                                style={{
                                  ...rtlText,
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: "#1e40af",
                                }}
                              >
                                {t("recommendations")}
                              </Text>
                              <Text
                                style={{
                                  ...rtlText,
                                  fontSize: 12,
                                  color: colors.textSecondary,
                                  lineHeight: 16,
                                }}
                              >
                                {item.recommendations}
                              </Text>
                            </>
                          )}

                          {/* Re-open in chat */}
                          <Pressable
                            onPress={() => openHistoryItem(item)}
                            style={{
                              flexDirection: rowDirectionForAppLayout(isRTL),
                              alignItems: "center",
                              gap: 6,
                              marginTop: 4,
                              alignSelf: isRTL ? "flex-end" : "flex-start",
                            }}
                          >
                            <Ionicons
                              name="chatbubble-outline"
                              size={14}
                              color={colors.primary}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: colors.primary,
                              }}
                            >
                              {t("newAssessment")}
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      <View style={{ alignItems: "center", marginTop: 4 }}>
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color={colors.textMuted}
                        />
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        ) : (
          /* ═══════════════ CHAT VIEW ═══════════════ */
          <>
            {/* Pet selector strip */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  flexDirection: rowDirectionForAppLayout(isRTL),
                }}
              >
                {pets.map((pet) => {
                  const selected = pet.id === selectedPetId;
                  return (
                    <Pressable
                      key={pet.id}
                      onPress={() => {
                        setSelectedPetId(pet.id);
                        if (pet.id !== selectedPetId) {
                          setMessages([]);
                          setNearbyVets([]);
                        }
                      }}
                      style={{
                        flexDirection: rowDirectionForAppLayout(isRTL),
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>
                        {getSpeciesEmoji(pet.species)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: selected ? "#fff" : colors.textSecondary,
                        }}
                        numberOfLines={1}
                      >
                        {pet.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Chat messages */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 16,
                gap: 12,
              }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {/* Disclaimer — always visible */}
              <View
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "flex-start",
                  backgroundColor: "#fef9c3",
                  borderRadius: 12,
                  padding: 10,
                  gap: 8,
                }}
              >
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color="#b45309"
                  style={{ marginTop: 1 }}
                />
                <Text
                  style={[
                    rtlText,
                    { flex: 1, fontSize: 11, color: "#92400e", lineHeight: 16 },
                  ]}
                >
                  {t("emergencyDisclaimer")}
                </Text>
              </View>

              {/* Welcome bubble (before any messages) */}
              {selectedPet && messages.length === 0 && (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    borderTopLeftRadius: isRTL ? 16 : 4,
                    borderTopRightRadius: isRTL ? 4 : 16,
                    padding: 14,
                    maxWidth: "85%",
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <Text
                    style={{
                      ...rtlText,
                      fontSize: 14,
                      color: colors.textSecondary,
                      lineHeight: 20,
                    }}
                  >
                    {t("triageWelcome")}{" "}
                    <Text style={{ fontWeight: "700", color: colors.text }}>
                      {selectedPet.name}
                    </Text>
                    {t("triageWelcomeEnd")}
                  </Text>
                </View>
              )}

              {!selectedPet && messages.length === 0 && (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
                  <Ionicons name="paw-outline" size={48} color={colors.textMuted} />
                  <Text
                    style={{
                      ...rtlText,
                      fontSize: 14,
                      color: colors.textMuted,
                      textAlign: "center",
                      marginTop: 16,
                    }}
                  >
                    {t("selectPet")}
                  </Text>
                </View>
              )}

              {/* Messages */}
              {messages.map((msg, idx) =>
                msg.role === "user" ? (
                  <UserBubble key={idx} msg={msg} />
                ) : (
                  <AssessmentCard key={idx} msg={msg} />
                ),
              )}

              {/* AI analyzing */}
              {assessing && (
                <View
                  style={{
                    alignSelf: isRTL ? "flex-end" : "flex-start",
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    gap: 12,
                    maxWidth: "92%",
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={{
                      ...rtlText,
                      flex: 1,
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      lineHeight: 20,
                    }}
                  >
                    {t("triageAnalyzing")}
                  </Text>
                </View>
              )}

              {/* Nearby vets section */}
              {nearbyLoading && (
                <View
                  style={{
                    backgroundColor: "#ecfdf5",
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ActivityIndicator size="small" color="#10b981" />
                  <Text
                    style={{ fontSize: 13, color: "#059669", fontWeight: "600" }}
                  >
                    {t("findingProviders")}
                  </Text>
                </View>
              )}

              {nearbyVets.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#059669",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    🏥 {t("nearbyVets")}
                  </Text>
                  {nearbyVets.map((vet) => (
                    <NearbyVetCard key={vet.providerId} vet={vet} />
                  ))}
                </View>
              )}
            </ScrollView>

            {/* ─── Input bar (only when pet selected) ─── */}
            {selectedPet && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderLight,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  paddingBottom: Platform.OS === "ios" ? 28 : 10,
                }}
              >
                {/* Image preview */}
                {imageUri && (
                  <View
                    style={{
                      flexDirection: rowDirectionForAppLayout(isRTL),
                      alignItems: "center",
                      marginBottom: 8,
                      gap: 8,
                    }}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                      }}
                    />
                    <Pressable onPress={() => { setImageUri(null); setImageBase64(null); }}>
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color="#ef4444"
                      />
                    </Pressable>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: rowDirectionForAppLayout(isRTL),
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  {/* Image attach: camera vs gallery */}
                  <Pressable
                    onPress={showPhotoSourcePicker}
                    disabled={assessing || triageImageProcessing}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceSecondary,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: assessing || triageImageProcessing ? 0.45 : 1,
                    }}
                  >
                    {triageImageProcessing ? (
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    ) : (
                      <Ionicons
                        name="images-outline"
                        size={20}
                        color={colors.textSecondary}
                      />
                    )}
                  </Pressable>

                  {/* Text input */}
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceTertiary,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      maxHeight: 120,
                    }}
                  >
                    <TextInput
                      style={[
                        rtlInput,
                        { fontSize: 14, color: colors.text, maxHeight: 100 },
                      ]}
                      placeholder={t("symptomsPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      value={symptomInput}
                      onChangeText={setSymptomInput}
                      multiline
                      editable={!assessing && !triageImageProcessing}
                    />
                  </View>

                  {/* Send */}
                  <Pressable
                    onPress={handleSubmit}
                    disabled={
                      assessing ||
                      triageImageProcessing ||
                      !symptomInput.trim()
                    }
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor:
                        symptomInput.trim() &&
                        !assessing &&
                        !triageImageProcessing
                          ? colors.primary
                          : colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {assessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons
                        name={isRTL ? "arrow-back" : "arrow-forward"}
                        size={18}
                        color={
                          symptomInput.trim() && !triageImageProcessing
                            ? "#fff"
                            : colors.textMuted
                        }
                      />
                    )}
                  </Pressable>
                </View>

                {/* Disclaimer under input */}
                <Text
                  style={{
                    fontSize: 9,
                    color: colors.textMuted,
                    textAlign: "center",
                    marginTop: 6,
                  }}
                >
                  {t("disclaimerFooter")}
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  /* ═══════════════ Sub-components ═══════════════ */

  function UserBubble({ msg }: { msg: UserMessage }) {
    return (
      <View
        style={{
          alignSelf: isRTL ? "flex-start" : "flex-end",
          maxWidth: "80%",
        }}
      >
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            borderBottomRightRadius: isRTL ? 16 : 4,
            borderBottomLeftRadius: isRTL ? 4 : 16,
            padding: 12,
          }}
        >
          {msg.imageUri && (
            <Image
              source={{ uri: msg.imageUri }}
              style={{
                width: 180,
                height: 130,
                borderRadius: 10,
                marginBottom: 6,
              }}
              resizeMode="cover"
            />
          )}
          <Text style={{ fontSize: 14, color: "#fff", lineHeight: 20 }}>
            {msg.text}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 10,
            color: colors.textMuted,
            textAlign: isRTL ? "left" : "right",
            marginTop: 2,
          }}
        >
          {msg.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  }

  function AssessmentCard({ msg }: { msg: AssistantMessage }) {
    const a = msg.assessment;
    const sevColor = SEVERITY_COLOR[a.severity] ?? "#94a3b8";

    return (
      <View
        style={{
          alignSelf: isRTL ? "flex-end" : "flex-start",
          maxWidth: "90%",
        }}
      >
        {/* Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderTopLeftRadius: isRTL ? 16 : 4,
            borderTopRightRadius: isRTL ? 4 : 16,
            overflow: "hidden",
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          {/* Severity header */}
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              backgroundColor: sevColor + "15",
              paddingHorizontal: 14,
              paddingVertical: 10,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: sevColor,
              }}
            />
            <Text style={{ fontSize: 13, fontWeight: "700", color: sevColor }}>
              {t("severity")}: {a.severity}
            </Text>
          </View>

          {/* Body */}
          <View style={{ padding: 14, gap: 10 }}>
            <Text
              style={{
                ...rtlText,
                fontSize: 11,
                fontWeight: "700",
                color: colors.textSecondary,
              }}
            >
              {t("assessment")}
            </Text>
            <Text
              style={{
                ...rtlText,
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 20,
              }}
            >
              {a.assessment}
            </Text>

            {a.recommendations && (
              <>
                <Text
                  style={{
                    ...rtlText,
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#1e40af",
                  }}
                >
                  {t("recommendations")}
                </Text>
                <Text
                  style={{
                    ...rtlText,
                    fontSize: 13,
                    color: colors.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {a.recommendations}
                </Text>
              </>
            )}

            {/* Consult a vet */}
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 6,
                marginTop: 2,
              }}
            >
              <Ionicons
                name="medkit-outline"
                size={14}
                color={colors.primary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: colors.primary,
                }}
              >
                {t("consultVet")}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: colors.surfaceTertiary,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
            }}
          >
            <Text style={{ fontSize: 10, color: colors.textMuted }}>
              {new Date(a.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text
              style={{ fontSize: 10, color: colors.textMuted, fontWeight: "600" }}
            >
              {t("aiAssessment")}
            </Text>
          </View>
        </View>

        {/* Emergency block */}
        {a.isEmergency && (
          <View
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: 14,
              padding: 14,
              marginTop: 8,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="warning" size={22} color="#ef4444" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#dc2626",
                  flex: 1,
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {t("emergencyWarning")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                gap: 8,
              }}
            >
              <Pressable
                onPress={() => Linking.openURL("tel:911")}
                style={{
                  flex: 1,
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: "#ef4444",
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="call" size={16} color="#fff" />
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                >
                  {t("callEmergency")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    "https://www.google.com/maps/search/emergency+veterinary+clinic+near+me",
                  )
                }
                style={{
                  flex: 1,
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: "#ef4444",
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Ionicons name="location" size={16} color="#ef4444" />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#ef4444",
                  }}
                >
                  {t("findEmergencyVet")}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Disclaimer footer */}
        <Text
          style={{
            fontSize: 10,
            color: colors.textMuted,
            textAlign: isRTL ? "right" : "left",
            marginTop: 4,
            paddingHorizontal: 4,
          }}
        >
          {t("disclaimerFooter")}
        </Text>
      </View>
    );
  }

  function NearbyVetCard({ vet }: { vet: NearbyVetDto }) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 12,
          flexDirection: rowDirectionForAppLayout(isRTL),
          gap: 12,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        {/* Avatar */}
        {vet.profileImageUrl ? (
          <Image
            source={{ uri: vet.profileImageUrl }}
            style={{ width: 48, height: 48, borderRadius: 14 }}
          />
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "#ecfdf5",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="medkit" size={22} color="#10b981" />
          </View>
        )}

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: colors.text,
              textAlign: isRTL ? "right" : "left",
            }}
            numberOfLines={1}
          >
            {vet.name}
          </Text>

          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              alignItems: "center",
              gap: 6,
              marginTop: 2,
            }}
          >
            {vet.averageRating > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {vet.averageRating.toFixed(1)}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 11, color: colors.textMuted }}>
              {vet.services}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              color: "#10b981",
              fontWeight: "600",
              marginTop: 2,
              textAlign: isRTL ? "right" : "left",
            }}
          >
            {vet.distanceKm.toFixed(1)} {t("kmAway")}
            {vet.address ? ` · ${vet.address}` : ""}
          </Text>

          {/* Actions */}
          <View
            style={{
              flexDirection: rowDirectionForAppLayout(isRTL),
              gap: 8,
              marginTop: 8,
            }}
          >
            {vet.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${vet.phone}`)}
                style={{
                  flexDirection: rowDirectionForAppLayout(isRTL),
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: colors.primaryLight,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Ionicons name="call" size={12} color={colors.primary} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: colors.primary,
                  }}
                >
                  {t("call")}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() =>
                openInMaps(vet.latitude, vet.longitude, vet.name)
              }
              style={{
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                gap: 4,
                backgroundColor: "#ecfdf5",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Ionicons name="navigate" size={12} color="#10b981" />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: "#10b981",
                }}
              >
                {t("directions")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }
}
