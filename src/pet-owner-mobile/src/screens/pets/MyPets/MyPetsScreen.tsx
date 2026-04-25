import { useEffect, useState, useCallback } from "react";
import { View, Pressable, Alert, ScrollView, RefreshControl, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../../store/authStore";
import { useMyPetsUiStore } from "../../../store/myPetsUiStore";
import { useTranslation, rowDirectionForAppLayout } from "../../../i18n";
import { usePetsStore } from "../../../store/petsStore";
import { medicalApi, triageApi } from "../../../api/client";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateHealthPassportHtml } from "../../../utils/HealthPassportPdf";
import { ShareHealthPassportModal } from "../../../components/ShareHealthPassportModal";
import { AuthPlaceholder } from "../../../components/AuthPlaceholder";
import { BrandedAppHeader } from "../../../components/BrandedAppHeader";
import { useTheme } from "../../../theme/ThemeContext";
import type { PetDto } from "../../../types/api";
import { ListSkeleton } from "../../../components/shared/ListSkeleton";
import { ListEmptyState } from "../../../components/shared/ListEmptyState";
import { InlineError } from "../../../components/shared/InlineError";
import { SectionShell } from "./sections/SectionShell";
import { PetInfoSection } from "./sections/PetInfoSection";
import { VaccinesSection } from "./sections/VaccinesSection";
import { WeightSection } from "./sections/WeightSection";
import { VaultSection } from "./sections/VaultSection";
import { TriageSection } from "./sections/TriageSection";
import { PetAvatarSwitcher } from "./components/PetAvatarSwitcher";
import { PetPassportCard } from "./components/PetPassportCard";
import { VaccineAlertBanner } from "./components/VaccineAlertBanner";
import { HealthHubList } from "./components/HealthHubList";
import { useActivePetSummary } from "./hooks/useActivePetSummary";
import type { Section } from "./types";
import { getNormalizedApiError } from "../../../utils/apiUtils";
import { showApiErrorToast } from "../../../services/apiErrorToast";

export function MyPetsScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { pets, loading, error } = usePetsStore();
  const { t, isRTL, rtlStyle } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [activePetIndex, setActivePetIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<Section>(null);
  const [shareModalPetId, setShareModalPetId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sectionReloadNonce, setSectionReloadNonce] = useState(0);

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

  const summary = useActivePetSummary(activePet?.id, sectionReloadNonce);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await usePetsStore.getState().fetchPets();
      setSectionReloadNonce((n) => n + 1);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
        medicalApi.getVaccineStatus(pet.id),
        medicalApi.getWeightHistory(pet.id),
        medicalApi.getMedicalRecords(pet.id),
        triageApi.getHistory(pet.id, { backgroundRequest: true }).catch(() => []),
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
    } catch (e: unknown) {
      showApiErrorToast(getNormalizedApiError(e), { title: t("errorTitle") });
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
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: colors.brand,
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

          {/* Avatar switcher row */}
          <PetAvatarSwitcher
            pets={pets}
            activeIndex={activePetIndex}
            onSelect={setActivePetIndex}
            onAddPress={() => navigation.navigate("AddPet")}
          />

          {/* Passport card */}
          {activePet && (
            <View style={{ marginTop: 14 }}>
              <PetPassportCard
                pet={activePet}
                onShare={() => setShareModalPetId(activePet.id)}
                onEdit={() => navigation.navigate("AddPet", { petId: activePet.id })}
                onDelete={() => handleDelete(activePet)}
                onExportPdf={() => handleExportPdf(activePet)}
              />
            </View>
          )}

          {/* Vaccine alert banners */}
          {activePet && (
            <VaccineAlertBanner petId={activePet.id} onPress={() => setActiveSection("vaccines")} />
          )}

          {/* Health hub dashboard */}
          <HealthHubList
            activePet={activePet}
            summary={summary}
            onSelectSection={(s) => {
              if (activePet) setActiveSection(s);
            }}
            onOpenTriage={() => navigation.navigate("Triage")}
          />
        </ScrollView>
      )}

      {shareModalPetId && (
        <ShareHealthPassportModal petId={shareModalPetId} visible onClose={() => setShareModalPetId(null)} />
      )}
    </SafeAreaView>
  );
}
