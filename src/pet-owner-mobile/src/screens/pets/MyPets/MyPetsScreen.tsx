import { useEffect, useState, useCallback, useRef } from "react";
import { View, FlatList, Pressable, Alert, ScrollView, RefreshControl, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../../store/authStore";
import { useMyPetsUiStore } from "../../../store/myPetsUiStore";
import { useTranslation } from "../../../i18n";
import { usePetsStore } from "../../../store/petsStore";
import { petHealthApi, triageApi } from "../../../api/client";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateHealthPassportHtml } from "../../../utils/HealthPassportPdf";
import { ShareHealthPassportModal } from "../../../components/ShareHealthPassportModal";
import { AuthPlaceholder } from "../../../components/AuthPlaceholder";
import { BrandedAppHeader } from "../../../components/BrandedAppHeader";
import { useTheme } from "../../../theme/ThemeContext";
import type { PetDto } from "../../../types/api";
import { useWindowDimensions } from "react-native";
import { ListSkeleton } from "../../../components/shared/ListSkeleton";
import { ListEmptyState } from "../../../components/shared/ListEmptyState";
import { InlineError } from "../../../components/shared/InlineError";
import { SectionShell } from "./sections/SectionShell";
import { PetInfoSection } from "./sections/PetInfoSection";
import { VaccinesSection } from "./sections/VaccinesSection";
import { WeightSection } from "./sections/WeightSection";
import { VaultSection } from "./sections/VaultSection";
import { TriageSection } from "./sections/TriageSection";
import { EmergencyStrip } from "./components/EmergencyStrip";
import { PetSwitcher } from "./components/PetSwitcher";
import { PetHeroCard } from "./components/PetHeroCard";
import { PetCardActions } from "./components/PetCardActions";
import { PetAllergyChips } from "./components/PetAllergyChips";
import { ActionTiles } from "./components/ActionTiles";
import { VaccineAlertBanner } from "./components/VaccineAlertBanner";
import { ActivityLogTile } from "./components/ActivityLogTile";
import { TriageHistoryTile } from "./components/TriageHistoryTile";
import type { Section } from "./types";

export function MyPetsScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { pets, loading, error } = usePetsStore();
  const { t, isRTL, rtlStyle } = useTranslation();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const { colors } = useTheme();

  const [activePetIndex, setActivePetIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [shareModalPetId, setShareModalPetId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sectionReloadNonce, setSectionReloadNonce] = useState(0);
  const pagerRef = useRef<FlatList<PetDto>>(null);

  const CARD_WIDTH = screenWidth - 48;

  useEffect(() => {
    if (isLoggedIn) usePetsStore.getState().fetchPets();
  }, [isLoggedIn]);

  const setSectionDetailOpen = useMyPetsUiStore((s) => s.setSectionDetailOpen);
  useEffect(() => {
    if (!isLoggedIn) {
      setSectionDetailOpen(false);
      return;
    }
    setSectionDetailOpen(activeSection != null);
    return () => setSectionDetailOpen(false);
  }, [isLoggedIn, activeSection, setSectionDetailOpen]);

  const activePet = pets[activePetIndex] ?? null;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await usePetsStore.getState().fetchPets();
      if (activeSection) setSectionReloadNonce((n) => n + 1);
    } finally {
      setRefreshing(false);
    }
  }, [activeSection]);

  const handleDelete = (pet: PetDto) => {
    const allPets = usePetsStore.getState().pets;
    if (allPets.length <= 1) {
      Alert.alert(t("errorTitle"), t("cannotDeleteLast"));
      return;
    }
    Alert.alert(t("softDeleteTitle"), t("softDeleteMessage"), [
      { text: t("softDeleteCancel"), style: "cancel" },
      {
        text: t("softDeleteConfirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await usePetsStore.getState().deletePet(pet.id);
            Alert.alert(t("petDeleted"));
            if (activePetIndex >= pets.length - 1) setActivePetIndex(Math.max(0, pets.length - 2));
          } catch {
            Alert.alert(t("errorTitle"), t("profileSaveError"));
          }
        },
      },
    ]);
  };

  const handleExportPdf = async (pet: PetDto) => {
    try {
      const user = useAuthStore.getState().user;
      const lang = useAuthStore.getState().language;
      const [vaccineStatuses, weightHistory, medicalRecords, triageHistory] = await Promise.all([
        petHealthApi.getVaccineStatus(pet.id),
        petHealthApi.getWeightHistory(pet.id),
        petHealthApi.getMedicalRecords(pet.id),
        triageApi.getHistory(pet.id).catch(() => []),
      ]);
      const html = generateHealthPassportHtml({
        pet,
        ownerName: user?.name ?? "",
        ownerEmail: user?.email,
        vaccineStatuses,
        weightHistory,
        medicalRecords,
        triageHistory,
        language: lang,
      });
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
    } catch {
      Alert.alert(t("errorTitle"), t("genericError"));
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, marginTop: -8 }} edges={["top"]}>
        <AuthPlaceholder title={t("myPetsTitle")} subtitle={t("myPetsSubtitle")} icon="paw-outline" />
      </SafeAreaView>
    );
  }

  if (activeSection && activePet) {
    return (
      <View style={{ flex: 1 }}>
        <SectionShell
          section={activeSection}
          pet={activePet}
          onBack={() => setActiveSection(null)}
          onExportPdf={() => handleExportPdf(activePet)}
          onShare={() => setShareModalPetId(activePet.id)}
        >
          {activeSection === "health" && <PetInfoSection pet={activePet} />}
          {activeSection === "vaccines" && <VaccinesSection petId={activePet.id} reloadNonce={sectionReloadNonce} />}
          {activeSection === "weight" && <WeightSection petId={activePet.id} reloadNonce={sectionReloadNonce} />}
          {activeSection === "records" && <VaultSection petId={activePet.id} reloadNonce={sectionReloadNonce} />}
          {activeSection === "triage" && <TriageSection petId={activePet.id} reloadNonce={sectionReloadNonce} />}
        </SectionShell>
        {shareModalPetId && (
          <ShareHealthPassportModal petId={shareModalPetId} visible onClose={() => setShareModalPetId(null)} />
        )}
      </View>
    );
  }

  const tileDisabled = !activePet;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <BrandedAppHeader />

      {loading && pets.length === 0 ? (
        <View style={{ flex: 1, paddingTop: 16 }}>
          <ListSkeleton rows={2} variant="card" />
        </View>
      ) : pets.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {error ? (
            <InlineError message={error} onRetry={() => usePetsStore.getState().fetchPets()} />
          ) : null}
          <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, minHeight: 320 }}>
            <ListEmptyState icon="paw-outline" title={t("noPets")} message={t("noPetsSubtitle")} />
            <Pressable
              onPress={() => navigation.navigate("AddPet")}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: colors.primary,
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 18,
                marginTop: 8,
                alignSelf: "center",
              }}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", ...rtlStyle }}>{t("addFirstPetCta")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {error ? (
            <InlineError message={error} onRetry={() => usePetsStore.getState().fetchPets()} />
          ) : null}

          <EmergencyStrip onPress={() => navigation.navigate("Triage")} />

          <PetSwitcher
            pets={pets}
            activeIndex={activePetIndex}
            onSelect={setActivePetIndex}
            onAddPress={() => navigation.navigate("AddPet")}
            pagerRef={pagerRef}
            isRTL={isRTL}
            primaryColor={colors.primary}
            borderColor={colors.border}
            textSecondary={colors.textSecondary}
          />

          <FlatList
            ref={pagerRef}
            data={pets}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 16}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + 16));
              setActivePetIndex(Math.min(idx, pets.length - 1));
            }}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH + 16,
              offset: (CARD_WIDTH + 16) * index,
              index,
            })}
            renderItem={({ item }) => (
              <View
                style={{
                  width: CARD_WIDTH,
                  marginRight: 16,
                  borderRadius: 24,
                  overflow: "hidden",
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <PetHeroCard pet={item} primaryColor={colors.primary} />
                <PetCardActions
                  pet={item}
                  isRTL={isRTL}
                  surfaceColor={colors.surface}
                  primaryColor={colors.primary}
                  primaryLight={colors.primaryLight}
                  onEdit={(p) => navigation.navigate("AddPet", { petId: p.id })}
                  onDelete={handleDelete}
                />
                <PetAllergyChips
                  pet={item}
                  isRTL={isRTL}
                  surfaceColor={colors.surface}
                  borderLight={colors.borderLight}
                />
              </View>
            )}
          />

          {activePet && (
            <VaccineAlertBanner petId={activePet.id} onPress={() => setActiveSection("vaccines")} />
          )}

          <ActionTiles
            disabled={tileDisabled}
            onSelectSection={(s) => {
              if (activePet) setActiveSection(s);
            }}
          />

          <ActivityLogTile disabled={tileDisabled} petId={activePet?.id} />

          <TriageHistoryTile
            disabled={tileDisabled}
            onPress={() => {
              if (activePet) setActiveSection("triage");
            }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
