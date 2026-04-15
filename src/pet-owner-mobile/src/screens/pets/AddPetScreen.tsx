import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import {
  createAddPetMicrochipSchema,
  type AddPetMicrochipFormValues,
} from "./addPetSchema";
import { BrandedAppHeader } from "../../components/BrandedAppHeader";
import { usePetsStore } from "../../store/petsStore";
import { PetSpecies } from "../../types/api";
import type { CreatePetRequest, UpdatePetRequest } from "../../types/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const speciesCards: { value: PetSpecies; emoji: string; labelKey: string }[] = [
  { value: PetSpecies.Dog, emoji: "🐶", labelKey: "speciesDog" },
  { value: PetSpecies.Cat, emoji: "🐱", labelKey: "speciesCat" },
  { value: PetSpecies.Rabbit, emoji: "🐰", labelKey: "speciesRabbit" },
  { value: PetSpecies.Bird, emoji: "🐦", labelKey: "speciesBird" },
  { value: PetSpecies.Other, emoji: "🐾", labelKey: "speciesOther" },
];

const DOG_BREEDS = [
  "Mixed / Mutt",
  "Golden Retriever",
  "Labrador",
  "German Shepherd",
  "Poodle",
  "Border Collie",
  "Malinois",
  "French Bulldog",
  "Shih Tzu",
  "Pomeranian",
  "Other",
];

const CAT_BREEDS = [
  "Mixed",
  "Persian",
  "Siamese",
  "British Shorthair",
  "Sphynx",
  "Maine Coon",
  "Street Cat",
  "Tricolor / Calico",
  "Other",
];

function getBreedsForSpecies(s: PetSpecies | null): string[] {
  if (s === PetSpecies.Dog) return DOG_BREEDS;
  if (s === PetSpecies.Cat) return CAT_BREEDS;
  return [];
}

export function AddPetScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const petId = route.params?.petId as string | undefined;
  const isEdit = !!petId;
  const { t, isRTL, isHebrew, language } = useTranslation();
  const { colors } = useTheme();

  const microchipSchema = useMemo(
    () =>
      createAddPetMicrochipSchema({
        validationMicrochipLength: t("validationMicrochipLength"),
      }),
    [language],
  );

  const {
    control: microchipControl,
    reset: resetMicrochipField,
    trigger: triggerMicrochipField,
    getValues: getMicrochipFormValues,
  } = useForm<AddPetMicrochipFormValues>({
    resolver: zodResolver(microchipSchema),
    defaultValues: { microchipNumber: "" },
    mode: "onChange",
  });

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<PetSpecies | null>(null);
  const [breed, setBreed] = useState("");
  const [customSpecies, setCustomSpecies] = useState("");

  // Step 2
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [isNeutered, setIsNeutered] = useState(false);
  const [allergyMode, setAllergyMode] = useState<"none" | "has">("none");
  const [allergies, setAllergies] = useState("");
  const [conditionMode, setConditionMode] = useState<"none" | "has">("none");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [notes, setNotes] = useState("");

  // Step 3
  const [medicalNotes, setMedicalNotes] = useState("");
  const [feedingSchedule, setFeedingSchedule] = useState("");
  const [vetName, setVetName] = useState("");
  const [vetPhone, setVetPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [petAddedCelebration, setPetAddedCelebration] = useState<{
    name: string;
  } | null>(null);
  const confettiLeftRef = useRef<InstanceType<typeof ConfettiCannon> | null>(
    null,
  );
  const confettiRightRef = useRef<InstanceType<typeof ConfettiCannon> | null>(
    null,
  );

  useEffect(() => {
    if (!isEdit) return;
    const pet = usePetsStore.getState().pets.find((p) => p.id === petId);
    if (pet) {
      setName(pet.name);
      setSpecies(pet.species);
      setBreed(pet.breed ?? "");
      setAge(String(pet.age));
      setWeight(pet.weight != null ? String(pet.weight) : "");
      setAllergies(pet.allergies ?? "");
      setMedicalConditions(pet.medicalConditions ?? "");
      setNotes(pet.notes ?? "");
      setIsNeutered(pet.isNeutered);
      setMedicalNotes(pet.medicalNotes ?? "");
      setFeedingSchedule(pet.feedingSchedule ?? "");
      resetMicrochipField({ microchipNumber: pet.microchipNumber ?? "" });
      setVetName(pet.vetName ?? "");
      setVetPhone(pet.vetPhone ?? "");
      if (pet.allergies?.trim()) setAllergyMode("has");
      if (pet.medicalConditions?.trim()) setConditionMode("has");
      if (pet.imageUrl) setAvatarUri(pet.imageUrl);
    }
  }, [isEdit, petId, resetMicrochipField]);

  useEffect(() => {
    if (!petAddedCelebration) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        confettiLeftRef.current?.start();
        confettiRightRef.current?.start();
      });
    });
    const navTimer = setTimeout(() => {
      navigation.goBack();
    }, 2500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(navTimer);
    };
  }, [petAddedCelebration, navigation]);

  const animateStep = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const breedRequired =
    species === PetSpecies.Dog || species === PetSpecies.Cat;

  const step1Ready =
    name.trim().length > 0 &&
    species !== null &&
    (!breedRequired || breed.trim().length > 0) &&
    (species !== PetSpecies.Other || customSpecies.trim().length > 0);

  const step2Ready =
    age.trim().length > 0 && !isNaN(Number(age));

  const isStep1Valid = (): boolean => step1Ready;

  const isStep2Valid = (): boolean => step2Ready;

  const nextStep = () => {
    if (currentStep === 1 && !isStep1Valid()) return;
    if (currentStep === 2 && !isStep2Valid()) return;
    setCurrentStep((s) => Math.min(s + 1, 3));
    animateStep();
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
    animateStep();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !age.trim() || species === null) {
      Alert.alert(t("errorTitle"), t("fillAllFields"));
      return;
    }
    const microchipOk = await triggerMicrochipField("microchipNumber");
    if (!microchipOk) return;
    setSaving(true);
    try {
      const breedValue =
        species === PetSpecies.Other && customSpecies.trim()
          ? breed.trim()
            ? `${customSpecies.trim()} - ${breed.trim()}`
            : customSpecies.trim()
          : breed.trim() || undefined;

      const data: CreatePetRequest = {
        name: name.trim(),
        species: species!,
        breed: breedValue,
        age: Number(age),
        weight: weight.trim()
          ? weightUnit === "lbs"
            ? Math.round(Number(weight) * 0.453592 * 100) / 100
            : Number(weight)
          : undefined,
        allergies:
          allergyMode === "has" ? allergies.trim() || undefined : undefined,
        medicalConditions:
          conditionMode === "has"
            ? medicalConditions.trim() || undefined
            : undefined,
        notes: notes.trim() || undefined,
        isNeutered,
        medicalNotes: medicalNotes.trim() || undefined,
        feedingSchedule: feedingSchedule.trim() || undefined,
        microchipNumber: getMicrochipFormValues("microchipNumber").trim() || undefined,
        vetName: vetName.trim() || undefined,
        vetPhone: vetPhone.trim() || undefined,
      };

      if (isEdit) {
        await usePetsStore
          .getState()
          .updatePet(petId!, data as UpdatePetRequest);
        navigation.goBack();
      } else {
        await usePetsStore.getState().addPet(data);
        setPetAddedCelebration({ name: name.trim() });
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
          ? (e as Error).message
          : t("profileSaveError");
      Alert.alert(t("errorTitle"), msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
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
            await usePetsStore.getState().deletePet(petId!);
            Alert.alert(t("petDeleted"));
            navigation.goBack();
          } catch {
            Alert.alert(t("errorTitle"), t("profileSaveError"));
          }
        },
      },
    ]);
  };

  const textAlign = isRTL ? ("right" as const) : ("left" as const);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, marginTop: -8 }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <BrandedAppHeader
          leading={
            <Pressable
              onPress={() =>
                currentStep > 1 ? prevStep() : navigation.goBack()
              }
              hitSlop={12}
            >
              <Ionicons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={24}
                color={colors.text}
              />
            </Pressable>
          }
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 24,
            ...Platform.select({ android: { paddingTop: 24 } }),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Progress Bar ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 20,
              marginBottom: 28,
              paddingHorizontal: 4,
            }}
          >
            {[1, 2, 3].map((step) => (
              <View
                key={step}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    currentStep >= step ? colors.primary : colors.inputBg,
                }}
              />
            ))}
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* ═══════════ STEP 1: Basic Info ═══════════ */}
            {currentStep === 1 && (
              <View style={{ gap: 28 }}>
                {/* Avatar Upload */}
                <View style={{ alignItems: "center", gap: 12 }}>
                  <Pressable
                    onPress={pickImage}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 2,
                      borderStyle: "dashed",
                      borderColor: avatarUri ? colors.primary : colors.border,
                      backgroundColor: colors.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={{ width: 120, height: 120 }}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="camera-outline"
                          size={32}
                          color={colors.textMuted}
                        />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color: colors.textMuted,
                            marginTop: 4,
                          }}
                        >
                          {t("uploadPhoto")}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: colors.textSecondary,
                    }}
                  >
                    {t("uploadPhotoHint")}
                  </Text>
                </View>

                {/* Pet Name */}
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text,
                      paddingHorizontal: 4,
                      textAlign,
                    }}
                  >
                    {t("petName")}{" "}
                    <Text style={{ color: colors.danger }}>*</Text>
                  </Text>
                  <TextInput
                    style={inputStyle(isRTL, colors)}
                    value={name}
                    onChangeText={setName}
                    placeholder={t("petNamePlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    textAlign={textAlign}
                  />
                </View>

                {/* Species Selector */}
                <View style={{ gap: 12 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text,
                      paddingHorizontal: 4,
                      textAlign,
                    }}
                  >
                    {t("petSpecies")}{" "}
                    <Text style={{ color: colors.danger }}>*</Text>
                  </Text>
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    {speciesCards.map((card) => {
                      const isSelected = species === card.value;
                      return (
                        <Pressable
                          key={card.value}
                          onPress={() => {
                            if (species !== card.value) setBreed("");
                            setSpecies(card.value);
                          }}
                          style={{
                            flex: 1,
                            minWidth: 58,
                            height: 80,
                            borderRadius: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                          }}
                        >
                          <Text style={{ fontSize: 24 }}>{card.emoji}</Text>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: isSelected ? "#fff" : colors.textSecondary,
                            }}
                          >
                            {t(card.labelKey as any)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Custom species name (when "Other" selected) */}
                {species === PetSpecies.Other && (
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.text,
                        paddingHorizontal: 4,
                        textAlign,
                      }}
                    >
                      {t("customSpeciesLabel")}{" "}
                      <Text style={{ color: colors.danger }}>*</Text>
                    </Text>
                    <TextInput
                      style={inputStyle(isRTL, colors)}
                      value={customSpecies}
                      onChangeText={setCustomSpecies}
                      placeholder={t("customSpeciesPlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      textAlign={textAlign}
                    />
                  </View>
                )}

                {/* Breed (conditional) */}
                {species != null && (
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.text,
                        paddingHorizontal: 4,
                        textAlign,
                      }}
                    >
                      {t("petBreed")}
                      {breedRequired && (
                        <Text style={{ color: colors.danger }}> *</Text>
                      )}
                    </Text>
                    {getBreedsForSpecies(species).length > 0 ? (
                      <Pressable
                        onPress={() => setShowBreedPicker(true)}
                        style={[
                          inputStyle(isRTL, colors),
                          {
                            flexDirection: isRTL ? "row-reverse" : "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "500",
                            color: breed ? colors.text : colors.textMuted,
                            flex: 1,
                            textAlign,
                          }}
                        >
                          {breed || t("selectBreed")}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={colors.textMuted}
                        />
                      </Pressable>
                    ) : (
                      <TextInput
                        style={inputStyle(isRTL, colors)}
                        value={breed}
                        onChangeText={setBreed}
                        placeholder={t("petBreedPlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        textAlign={textAlign}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ═══════════ STEP 2: Details ═══════════ */}
            {currentStep === 2 && (
              <View style={{ gap: 28 }}>
                {/* Section title */}
                <View style={{ alignItems: "center", marginBottom: 4 }}>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "800",
                      color: colors.text,
                      marginBottom: 6,
                      textAlign: "center",
                    }}
                  >
                    {t("stepDetails")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    {t("stepDetailsDesc")}
                  </Text>
                </View>

                {/* Age & Weight row */}
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.text,
                        paddingHorizontal: 4,
                        textAlign,
                      }}
                    >
                      {t("ageYears")}{" "}
                      <Text style={{ color: colors.danger }}>*</Text>
                    </Text>
                    <TextInput
                      style={inputStyle(isRTL, colors)}
                      value={age}
                      onChangeText={setAge}
                      placeholder={t("petAgePlaceholder")}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      textAlign={textAlign}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: colors.text,
                        paddingHorizontal: 4,
                        textAlign,
                      }}
                    >
                      {t("petWeight")}
                    </Text>
                    <View
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <TextInput
                        style={[inputStyle(isRTL, colors), { flex: 1 }]}
                        value={weight}
                        onChangeText={setWeight}
                        placeholder={t("petWeightPlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        textAlign={textAlign}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          backgroundColor: colors.inputBg,
                          borderRadius: 10,
                          padding: 2,
                        }}
                      >
                        {(["kg", "lbs"] as const).map((unit) => {
                          const selected = weightUnit === unit;
                          return (
                            <Pressable
                              key={unit}
                              onPress={() => setWeightUnit(unit)}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                backgroundColor: selected
                                  ? colors.primary
                                  : "transparent",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "700",
                                  color: selected ? "#fff" : colors.textSecondary,
                                }}
                              >
                                {unit === "kg" ? t("weightUnitKg") : t("weightUnitLbs")}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Neutered Toggle Card */}
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 12,
                    padding: 18,
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        color: colors.text,
                        fontSize: 15,
                        textAlign,
                      }}
                    >
                      {t("neuteredQuestion")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 2,
                        textAlign,
                      }}
                    >
                      {t("neuteredHelp")}
                    </Text>
                  </View>
                  <Switch
                    value={isNeutered}
                    onValueChange={setIsNeutered}
                    trackColor={{ false: colors.inputBg, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Allergies segmented */}
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text,
                      paddingHorizontal: 4,
                      textAlign,
                    }}
                  >
                    {t("petAllergies")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: colors.inputBg,
                      borderRadius: 99,
                      padding: 3,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setAllergyMode("none");
                        setAllergies("");
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 99,
                        alignItems: "center",
                        backgroundColor:
                          allergyMode === "none" ? colors.surface : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: allergyMode === "none" ? "700" : "500",
                          color:
                            allergyMode === "none" ? colors.text : colors.textSecondary,
                        }}
                      >
                        {t("noAllergies")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAllergyMode("has")}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 99,
                        alignItems: "center",
                        backgroundColor:
                          allergyMode === "has" ? colors.surface : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: allergyMode === "has" ? "700" : "500",
                          color:
                            allergyMode === "has" ? colors.text : colors.textSecondary,
                        }}
                      >
                        {t("hasAllergies")}
                      </Text>
                    </Pressable>
                  </View>
                  {allergyMode === "has" && (
                    <TextInput
                      style={[inputStyle(isRTL, colors), { marginTop: 4 }]}
                      value={allergies}
                      onChangeText={setAllergies}
                      placeholder={t("specifyAllergy")}
                      placeholderTextColor={colors.textMuted}
                      textAlign={textAlign}
                    />
                  )}
                </View>

                {/* Medical Conditions segmented */}
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text,
                      paddingHorizontal: 4,
                      textAlign,
                    }}
                  >
                    {t("petMedicalConditions")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: colors.inputBg,
                      borderRadius: 99,
                      padding: 3,
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        setConditionMode("none");
                        setMedicalConditions("");
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 99,
                        alignItems: "center",
                        backgroundColor:
                          conditionMode === "none" ? colors.surface : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: conditionMode === "none" ? "700" : "500",
                          color:
                            conditionMode === "none" ? colors.text : colors.textSecondary,
                        }}
                      >
                        {t("noConditions")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setConditionMode("has")}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 99,
                        alignItems: "center",
                        backgroundColor:
                          conditionMode === "has" ? colors.surface : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: conditionMode === "has" ? "700" : "500",
                          color:
                            conditionMode === "has" ? colors.text : colors.textSecondary,
                        }}
                      >
                        {t("hasConditions")}
                      </Text>
                    </Pressable>
                  </View>
                  {conditionMode === "has" && (
                    <TextInput
                      style={[inputStyle(isRTL, colors), { marginTop: 4 }]}
                      value={medicalConditions}
                      onChangeText={setMedicalConditions}
                      placeholder={t("specifyCondition")}
                      placeholderTextColor={colors.textMuted}
                      textAlign={textAlign}
                    />
                  )}
                </View>

                {/* Notes */}
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: colors.text,
                      paddingHorizontal: 4,
                      textAlign,
                    }}
                  >
                    {t("petNotes")}
                  </Text>
                  <TextInput
                    style={[
                      inputStyle(isRTL, colors),
                      { height: undefined, minHeight: 90, textAlignVertical: "top", paddingTop: 14 },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t("petNotesPlaceholder")}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    textAlign={textAlign}
                  />
                </View>
              </View>
            )}

            {/* ═══════════ STEP 3: Medical & Vet ═══════════ */}
            {currentStep === 3 && (
              <View style={{ gap: 28 }}>
                {/* Step indicator */}
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.text,
                      letterSpacing: 1.5,
                    }}
                  >
                    {t("stepOf")
                      .replace("{step}", "3")
                      .replace("{total}", "3")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: "#506356",
                    }}
                  >
                    {t("stepMedical")}
                  </Text>
                </View>

                {/* Info Banner */}
                <View
                  style={{
                    backgroundColor: "rgba(211,232,215,0.3)",
                    padding: 18,
                    borderRadius: 16,
                    borderLeftWidth: isRTL ? 0 : 4,
                    borderRightWidth: isRTL ? 4 : 0,
                    borderLeftColor: "#506356",
                    borderRightColor: "#506356",
                    flexDirection: isRTL ? "row-reverse" : "row",
                    gap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#506356"
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: colors.text,
                      lineHeight: 20,
                      fontWeight: "500",
                      textAlign,
                    }}
                  >
                    {t("stepMedicalDesc")}
                  </Text>
                </View>

                {/* Health & Care Section */}
                <View style={{ gap: 6 }}>
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: colors.primaryLight,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="medkit" size={18} color={colors.primary} />
                    </View>
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: "800",
                        color: colors.text,
                      }}
                    >
                      {t("healthAndCare")}
                    </Text>
                  </View>

                  <View style={{ gap: 18 }}>
                    {/* Medical Notes */}
                    <View style={{ gap: 6 }}>
                      <Text style={fieldLabelStyle(textAlign, colors)}>
                        {t("medicalNotes")}
                      </Text>
                      <TextInput
                        style={[
                          inputStyle(isRTL, colors),
                          { height: undefined, minHeight: 110, textAlignVertical: "top", paddingTop: 14 },
                        ]}
                        value={medicalNotes}
                        onChangeText={setMedicalNotes}
                        placeholder={t("medicalNotesPlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        textAlign={textAlign}
                      />
                    </View>

                    {/* Feeding Schedule */}
                    <View style={{ gap: 6 }}>
                      <Text style={fieldLabelStyle(textAlign, colors)}>
                        {t("feedingSchedule")}
                      </Text>
                      <TextInput
                        style={[
                          inputStyle(isRTL, colors),
                          { height: undefined, minHeight: 90, textAlignVertical: "top", paddingTop: 14 },
                        ]}
                        value={feedingSchedule}
                        onChangeText={setFeedingSchedule}
                        placeholder={t("feedingPlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        textAlign={textAlign}
                      />
                    </View>

                    {/* Microchip */}
                    <View style={{ gap: 6 }}>
                      <Text style={fieldLabelStyle(textAlign, colors)}>
                        {t("microchip")}
                      </Text>
                      <Controller
                        control={microchipControl}
                        name="microchipNumber"
                        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                          <View style={{ gap: 6 }}>
                            <TextInput
                              style={[
                                inputStyle(isRTL, colors),
                                {
                                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                                  letterSpacing: 2,
                                  borderWidth: error ? 1.5 : 0,
                                  borderColor: error ? colors.danger : "transparent",
                                },
                              ]}
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              placeholder={t("microchipPlaceholder")}
                              placeholderTextColor={colors.textMuted}
                              textAlign={textAlign}
                              keyboardType="number-pad"
                              maxLength={15}
                            />
                            {error?.message ? (
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.danger,
                                  textAlign,
                                  marginStart: 8,
                                }}
                              >
                                {error.message}
                              </Text>
                            ) : null}
                          </View>
                        )}
                      />
                    </View>
                  </View>
                </View>

                {/* Vet Details Section */}
                <View style={{ gap: 6 }}>
                  <View
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: "#d3e8d7",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color="#506356"
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 19,
                        fontWeight: "800",
                        color: colors.text,
                      }}
                    >
                      {t("vetDetails")}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 16,
                      padding: 20,
                      gap: 18,
                    }}
                  >
                    <View style={{ gap: 6 }}>
                      <Text style={fieldLabelStyle(textAlign, colors)}>
                        {t("vetName")}
                      </Text>
                      <TextInput
                        style={[inputStyle(isRTL, colors), { backgroundColor: colors.surface }]}
                        value={vetName}
                        onChangeText={setVetName}
                        placeholder={t("vetNamePlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        textAlign={textAlign}
                      />
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={fieldLabelStyle(textAlign, colors)}>
                        {t("vetPhone")}
                      </Text>
                      <TextInput
                        style={[inputStyle(isRTL, colors), { backgroundColor: colors.surface }]}
                        value={vetPhone}
                        onChangeText={setVetPhone}
                        placeholder={t("vetPhonePlaceholder")}
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        textAlign={isRTL ? "right" : "left"}
                      />
                    </View>
                  </View>
                </View>

                {/* Delete button (edit mode) */}
                {isEdit && (
                  <Pressable
                    onPress={handleDelete}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.dangerLight,
                      marginTop: 8,
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: colors.danger,
                      }}
                    >
                      {t("deletePetProfile")}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* ═══════════ Bottom Action Bar ═══════════ */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            paddingHorizontal: 24,
            paddingVertical: 16,
            paddingBottom: Platform.OS === "ios" ? 36 : 16,
          }}
        >
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              gap: 12,
              alignItems: "center",
            }}
          >
            {currentStep === 1 && (
              <Pressable
                onPress={nextStep}
                disabled={!step1Ready}
                style={{
                  flex: 1,
                  height: 54,
                  borderRadius: 27,
                  backgroundColor: colors.primary,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  opacity: step1Ready ? 1 : 0.4,
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}
                >
                  {t("continueStep")}
                </Text>
                <Ionicons
                  name={isRTL ? "arrow-back" : "arrow-forward"}
                  size={18}
                  color="#fff"
                />
              </Pressable>
            )}

            {currentStep === 2 && (
              <>
                <Pressable
                  onPress={prevStep}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: colors.border,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}
                  >
                    {t("backStep")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={nextStep}
                  disabled={!step2Ready}
                  style={{
                    flex: 2,
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    opacity: step2Ready ? 1 : 0.4,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: "#fff",
                      fontSize: 15,
                    }}
                  >
                    {t("continueStep")}
                  </Text>
                </Pressable>
              </>
            )}

            {currentStep === 3 && (
              <>
                <Pressable
                  onPress={prevStep}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: colors.border,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontWeight: "700", color: colors.textSecondary, fontSize: 15 }}
                  >
                    {t("backStep")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 2,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    paddingVertical: 16,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="paw" size={18} color="#fff" />
                      <Text
                        style={{
                          fontWeight: "700",
                          color: "#fff",
                          fontSize: 15,
                        }}
                      >
                        {isEdit ? t("updatePet") : t("savePet")}
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ═══════════ Breed Picker Modal ═══════════ */}
      <Modal
        visible={showBreedPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBreedPicker(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay }}
          onPress={() => setShowBreedPicker(false)}
        />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
            maxHeight: "60%",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {t("selectBreed")}
          </Text>
          <FlatList
            data={getBreedsForSpecies(species)}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const selected = breed === item;
              return (
                <Pressable
                  onPress={() => {
                    setBreed(item);
                    setShowBreedPicker(false);
                  }}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                    backgroundColor: selected
                      ? colors.surfaceSecondary
                      : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: selected ? "700" : "500",
                      color: selected ? colors.text : colors.textSecondary,
                    }}
                  >
                    {item}
                  </Text>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      {petAddedCelebration && (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View style={styles.celebrationRoot} pointerEvents="box-none">
            <View style={[styles.celebrationBackdrop, { backgroundColor: colors.overlay }]} />
            <View
              style={[
                styles.celebrationCard,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View style={styles.celebrationIconWrap}>
                <Ionicons name="sparkles" size={28} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.celebrationMessage,
                  {
                    color: colors.text,
                    textAlign: "center",
                    writingDirection: isRTL ? "rtl" : "ltr",
                  },
                ]}
              >
                {t("petAddedSuccessMessage").replace(
                  "{name}",
                  petAddedCelebration.name,
                )}
              </Text>
            </View>
            <View
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              collapsable={false}
            >
              <ConfettiCannon
                ref={confettiLeftRef}
                count={160}
                origin={{ x: SCREEN_WIDTH * 0.12, y: -24 }}
                autoStart={false}
                fadeOut
                fallSpeed={3600}
                explosionSpeed={420}
                colors={[
                  "#7c3aed",
                  "#0d9488",
                  "#f59e0b",
                  "#ec4899",
                  "#3b82f6",
                  "#fef08a",
                ]}
              />
              <ConfettiCannon
                ref={confettiRightRef}
                count={160}
                origin={{ x: SCREEN_WIDTH * 0.88, y: -24 }}
                autoStart={false}
                fadeOut
                fallSpeed={3600}
                explosionSpeed={420}
                colors={[
                  "#7c3aed",
                  "#0d9488",
                  "#f59e0b",
                  "#ec4899",
                  "#3b82f6",
                  "#fef08a",
                ]}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function inputStyle(isRTL: boolean, colors: any) {
  return {
    width: "100%" as const,
    height: 52,
    paddingHorizontal: 18,
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500" as const,
    color: colors.text,
    writingDirection: (isRTL ? "rtl" : "ltr") as "rtl" | "ltr",
  };
}

function fieldLabelStyle(textAlign: "left" | "right", colors: any) {
  return {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.textSecondary,
    marginStart: 8,
    marginBottom: 2,
    textAlign,
  };
}

const styles = StyleSheet.create({
  celebrationRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  celebrationBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  celebrationCard: {
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginHorizontal: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    alignItems: "center",
  },
  celebrationIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  celebrationMessage: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
    alignSelf: "stretch",
  },
});
