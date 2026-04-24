/**
 * Israel-restricted, Hebrew-first address autocomplete powered by Google Places.
 *
 * Drop-in replacement for the old Nominatim search inputs and the static
 * `CityAutocompleteInput`. The component is fully controlled and styled to
 * match the rest of the form fields (theme colors, RTL support, optional
 * required asterisk).
 *
 * Behaviour highlights:
 *   - Debounced (250ms) Autocomplete requests.
 *   - One billing session per typing burst (re-created after each selection).
 *   - On select, fetches Place Details to get exact lat/lng + parsed
 *     `city / street / streetNumber` ready to feed the backend
 *     `NetTopologySuite` GeoLocation column.
 *   - Renders `structured_formatting.main_text` prominently and
 *     `structured_formatting.secondary_text` muted underneath — no more
 *     unreadable "Rothschild, Holon, Shikun Am, ..." rows.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rowDirectionForAppLayout } from "../../i18n";
import { useTheme } from "../../theme/ThemeContext";
import {
  createPlacesSession,
  fetchPlaceAutocomplete,
  fetchPlaceDetails,
  type PlaceAutocompleteType,
  type PlacePrediction,
  type PlacesSession,
} from "../../api/googlePlaces";

/**
 * Selection payload emitted by {@link AddressAutocomplete} when the user taps
 * a Google Places suggestion AND the Place Details lookup succeeds.
 */
export interface AddressAutocompleteSelection {
  /** Localised single-line address — safe to show or persist. */
  formattedAddress: string;
  /** Bold first line from the dropdown row (e.g. "שדרות רוטשילד 3"). */
  mainText: string;
  /** Muted second line from the dropdown row (e.g. "תל אביב יפו"). */
  secondaryText: string;
  /** Exact coordinates from Google. */
  latitude: number;
  longitude: number;
  /** Parsed components — empty fields when Google can't determine them. */
  components: {
    city?: string;
    street?: string;
    streetNumber?: string;
    postalCode?: string;
    countryCode?: string;
  };
}

export interface AddressAutocompleteProps {
  label?: string;
  /** Show a red asterisk after the label. */
  required?: boolean;
  /** Controlled text value displayed in the input. */
  value: string;
  onChangeText: (text: string) => void;
  /** Fires when a suggestion is tapped AND Place Details succeeds. */
  onSelect: (selection: AddressAutocompleteSelection) => void;
  placeholder?: string;
  isRTL?: boolean;
  /**
   * What kind of result to autocomplete.
   * - `"address"` — full street addresses (default)
   * - `"(cities)"` — city-only
   * - `"(regions)"` — cities + regions
   * - `"geocode"` — anything geocoder can resolve
   * - `"establishment"` — businesses + POIs
   */
  type?: PlaceAutocompleteType;
  language?: "he" | "en";
  countryCode?: string;
  disabled?: boolean;
  /** Optional override for the suggestion list max height. */
  maxResultsHeight?: number;
  /** Render the dropdown absolutely over siblings (needed inside ScrollViews). */
  absoluteDropdown?: boolean;
  /** Inline error text (e.g. validation), shown below the input in red. */
  errorText?: string;
  /** Disable the trailing leading icon entirely. */
  hideLeadingIcon?: boolean;
  /** Disable the auto-issued required-asterisk render even when label set. */
  hideRequiredMark?: boolean;
}

const DEBOUNCE_MS = 250;

export function AddressAutocomplete({
  label,
  required,
  value,
  onChangeText,
  onSelect,
  placeholder,
  isRTL,
  type = "address",
  language,
  countryCode,
  disabled,
  maxResultsHeight = 260,
  absoluteDropdown = true,
  errorText,
  hideLeadingIcon,
  hideRequiredMark,
}: AddressAutocompleteProps) {
  const { colors } = useTheme();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [focused, setFocused] = useState(false);

  const sessionRef = useRef<PlacesSession>(createPlacesSession());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Suppress the next `onChangeText`-driven search after a programmatic value change (e.g. selection). */
  const suppressNextSearchRef = useRef(false);

  /* Cleanup any pending timers / requests when unmounting. */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = useCallback(
    (query: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      fetchPlaceAutocomplete({
        input: query,
        session: sessionRef.current,
        type,
        language,
        country: countryCode,
        signal: controller.signal,
      })
        .then((results) => {
          if (controller.signal.aborted) return;
          setPredictions(results);
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setSearching(false);
        });
    },
    [type, language, countryCode],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      if (suppressNextSearchRef.current) {
        suppressNextSearchRef.current = false;
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = text.trim();
      if (trimmed.length < 2) {
        setPredictions([]);
        setSearching(false);
        abortRef.current?.abort();
        return;
      }
      debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
    },
    [onChangeText, runSearch],
  );

  const handleClear = useCallback(() => {
    suppressNextSearchRef.current = true;
    onChangeText("");
    setPredictions([]);
    abortRef.current?.abort();
  }, [onChangeText]);

  const handleSelect = useCallback(
    async (prediction: PlacePrediction) => {
      // Show selection text immediately for a snappy feel.
      const displayText = prediction.secondaryText
        ? `${prediction.mainText}, ${prediction.secondaryText}`
        : prediction.mainText;
      suppressNextSearchRef.current = true;
      onChangeText(displayText);
      setPredictions([]);
      setFocused(false);
      setResolving(true);
      try {
        const details = await fetchPlaceDetails({
          placeId: prediction.placeId,
          session: sessionRef.current,
          language,
        });
        // Sessions are single-use — start a fresh one for the next typing burst.
        sessionRef.current = createPlacesSession();

        if (details) {
          // Prefer Google's canonical formatted_address over our composed display string.
          if (details.formattedAddress) {
            suppressNextSearchRef.current = true;
            onChangeText(details.formattedAddress);
          }
          onSelect({
            formattedAddress: details.formattedAddress || displayText,
            mainText: prediction.mainText,
            secondaryText: prediction.secondaryText,
            latitude: details.latitude,
            longitude: details.longitude,
            components: {
              city: details.components.city,
              street: details.components.street,
              streetNumber: details.components.streetNumber,
              postalCode: details.components.postalCode,
              countryCode: details.components.countryCode,
            },
          });
        }
      } finally {
        setResolving(false);
      }
    },
    [language, onChangeText, onSelect],
  );

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay so a tap on a suggestion fires onPress before the dropdown unmounts.
    blurTimerRef.current = setTimeout(() => setFocused(false), 180);
  }, []);

  const isOpen = focused && predictions.length > 0;
  const trailing = useMemo(() => {
    if (resolving || searching) {
      return (
        <ActivityIndicator size="small" color={colors.primary} />
      );
    }
    if (value.length > 0) {
      return (
        <Pressable onPress={handleClear} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      );
    }
    return null;
  }, [resolving, searching, value, colors.primary, colors.textMuted, handleClear]);

  return (
    <View style={{ position: "relative", zIndex: 50 }}>
      {label ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 6,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {label}
          {required && !hideRequiredMark ? (
            <Text style={{ color: colors.danger }}> *</Text>
          ) : null}
        </Text>
      ) : null}

      {/* Input row */}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          backgroundColor: disabled ? colors.surfaceSecondary : colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: errorText
            ? colors.danger
            : isOpen
              ? colors.primary
              : colors.border,
          paddingHorizontal: 12,
          opacity: disabled ? 0.6 : 1,
          gap: 8,
        }}
      >
        {!hideLeadingIcon ? (
          <Ionicons name="search" size={18} color={colors.textMuted} />
        ) : null}
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          style={{
            flex: 1,
            paddingVertical: 14,
            fontSize: 15,
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        />
        {trailing}
      </View>

      {errorText ? (
        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
            color: colors.danger,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {errorText}
        </Text>
      ) : null}

      {/* Dropdown */}
      {isOpen ? (
        <View
          style={{
            position: absoluteDropdown ? "absolute" : "relative",
            top: absoluteDropdown ? "100%" : undefined,
            left: 0,
            right: 0,
            marginTop: 6,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderLight ?? colors.border,
            maxHeight: maxResultsHeight,
            overflow: "hidden",
            shadowColor: colors.shadow ?? "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 12,
            zIndex: 100,
          }}
        >
          {predictions.map((prediction, idx) => (
            <SuggestionRow
              key={prediction.placeId}
              prediction={prediction}
              isLast={idx === predictions.length - 1}
              isRTL={!!isRTL}
              onPress={() => handleSelect(prediction)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ──────────────────────────── Subcomponents ──────────────────────────── */

interface SuggestionRowProps {
  prediction: PlacePrediction;
  isLast: boolean;
  isRTL: boolean;
  onPress: () => void;
}

function SuggestionRow({
  prediction,
  isLast,
  isRTL,
  onPress,
}: SuggestionRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: rowDirectionForAppLayout(isRTL),
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.borderLight ?? colors.border,
        backgroundColor: pressed
          ? colors.surfaceSecondary ?? colors.surfaceTertiary
          : colors.surface,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="location-sharp" size={14} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: colors.text,
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
        >
          {prediction.mainText}
        </Text>
        {prediction.secondaryText ? (
          <Text
            numberOfLines={1}
            style={{
              marginTop: 2,
              fontSize: 12,
              color: colors.textMuted,
              textAlign: isRTL ? "right" : "left",
              writingDirection: isRTL ? "rtl" : "ltr",
            }}
          >
            {prediction.secondaryText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
