import { rowDirectionForAppLayout } from "../../i18n";
import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTheme } from "../../theme/ThemeContext";

interface CityEntry {
  en: string;
  he: string;
  /** Static fallback latitude — used when geocodeAsync fails or returns empty. */
  lat: number;
  /** Static fallback longitude — used when geocodeAsync fails or returns empty. */
  lng: number;
}

/**
 * Major Israeli cities with bilingual display names and static coordinate
 * fallbacks. Coordinates sourced from city-centre approximations.
 */
const ISRAELI_CITIES: CityEntry[] = [
  { en: "Tel Aviv",        he: "תל אביב",      lat: 32.0853, lng: 34.7818 },
  { en: "Jerusalem",       he: "ירושלים",       lat: 31.7683, lng: 35.2137 },
  { en: "Haifa",           he: "חיפה",           lat: 32.7940, lng: 34.9896 },
  { en: "Rishon LeZion",   he: "ראשון לציון",   lat: 31.9730, lng: 34.7925 },
  { en: "Petah Tikva",     he: "פתח תקווה",     lat: 32.0843, lng: 34.8878 },
  { en: "Ashdod",          he: "אשדוד",          lat: 31.8178, lng: 34.6495 },
  { en: "Netanya",         he: "נתניה",          lat: 32.3226, lng: 34.8533 },
  { en: "Beersheba",       he: "באר שבע",        lat: 31.2530, lng: 34.7915 },
  { en: "Holon",           he: "חולון",           lat: 32.0158, lng: 34.7791 },
  { en: "Bnei Brak",       he: "בני ברק",        lat: 32.0840, lng: 34.8338 },
  { en: "Bat Yam",         he: "בת ים",          lat: 32.0230, lng: 34.7540 },
  { en: "Rehovot",         he: "רחובות",         lat: 31.8928, lng: 34.8113 },
  { en: "Ashkelon",        he: "אשקלון",         lat: 31.6688, lng: 34.5743 },
  { en: "Ramat Gan",       he: "רמת גן",         lat: 32.0684, lng: 34.8248 },
  { en: "Acre",            he: "עכו",             lat: 32.9238, lng: 35.0707 },
  { en: "Herzliya",        he: "הרצליה",         lat: 32.1659, lng: 34.8434 },
  { en: "Kfar Saba",       he: "כפר סבא",        lat: 32.1783, lng: 34.9076 },
  { en: "Raanana",         he: "רעננה",           lat: 32.1836, lng: 34.8737 },
  { en: "Modiin",          he: "מודיעין",         lat: 31.9030, lng: 35.0071 },
  { en: "Nazareth",        he: "נצרת",            lat: 32.6996, lng: 35.3035 },
  { en: "Lod",             he: "לוד",             lat: 31.9516, lng: 34.8956 },
  { en: "Ramla",           he: "רמלה",            lat: 31.9257, lng: 34.8599 },
  { en: "Ramat HaSharon",  he: "רמת השרון",      lat: 32.1524, lng: 34.8401 },
  { en: "Givatayim",       he: "גבעתיים",         lat: 32.0709, lng: 34.8130 },
  { en: "Eilat",           he: "אילת",            lat: 29.5577, lng: 34.9519 },
  { en: "Tiberias",        he: "טבריה",           lat: 32.7960, lng: 35.5308 },
  { en: "Kiryat Gat",      he: "קריית גת",        lat: 31.6100, lng: 34.7642 },
  { en: "Kiryat Motzkin",  he: "קריית מוצקין",   lat: 32.8359, lng: 35.0787 },
  { en: "Nahariya",        he: "נהריה",           lat: 33.0051, lng: 35.0921 },
];

export interface CityAutocompleteInputProps {
  label: string;
  /** When true, shows a red asterisk after the label (mandatory field). */
  required?: boolean;
  value: string;
  onChangeText: (city: string) => void;
  /**
   * Called when the user picks a suggestion and geocoding completes.
   * Always invoked — falls back to static coords if geocodeAsync fails.
   */
  onCitySelect: (city: string, lat: number, lng: number) => void;
  isRTL?: boolean;
}

export function CityAutocompleteInput({
  label,
  required,
  value,
  onChangeText,
  onCitySelect,
  isRTL,
}: CityAutocompleteInputProps) {
  const { colors } = useTheme();
  const [suggestions, setSuggestions] = useState<CityEntry[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  const filterCities = useCallback((text: string) => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    const q = text.toLowerCase();
    const matches = ISRAELI_CITIES.filter(
      (c) => c.en.toLowerCase().includes(q) || c.he.includes(text),
    );
    setSuggestions(matches.slice(0, 8));
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      filterCities(text);
    },
    [onChangeText, filterCities],
  );

  const handleSelectCity = useCallback(
    async (city: CityEntry) => {
      const displayName = isRTL ? city.he : city.en;
      setSuggestions([]);
      onChangeText(displayName);
      setGeocoding(true);
      try {
        const results = await Location.geocodeAsync(city.en);
        if (results.length > 0) {
          onCitySelect(displayName, results[0].latitude, results[0].longitude);
        } else {
          onCitySelect(displayName, city.lat, city.lng);
        }
      } catch {
        // geocodeAsync is best-effort; static coords are always available.
        onCitySelect(displayName, city.lat, city.lng);
      } finally {
        setGeocoding(false);
      }
    },
    [isRTL, onChangeText, onCitySelect],
  );

  const handleClear = useCallback(() => {
    onChangeText("");
    setSuggestions([]);
  }, [onChangeText]);

  const hasInput = value.length > 0;
  const isOpen = suggestions.length > 0;

  return (
    <View>
      {/* Label */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 4,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>

      {/* Input row */}
      <View
        style={{
          flexDirection: rowDirectionForAppLayout(isRTL),
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isOpen ? colors.primary : colors.border,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          onBlur={() => {
            // Delay so suggestion Pressable onPress fires first.
            setTimeout(() => setSuggestions([]), 200);
          }}
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.text,
            paddingVertical: 12,
            textAlign: isRTL ? "right" : "left",
            writingDirection: isRTL ? "rtl" : "ltr",
          }}
          placeholderTextColor={colors.textMuted}
        />
        {geocoding ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
        ) : hasInput ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Ionicons name="location-outline" size={18} color={colors.textMuted} />
        )}
      </View>

      {/* Suggestions dropdown */}
      {isOpen && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderLight ?? colors.border,
            marginTop: 4,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          {suggestions.map((city, idx) => (
            <Pressable
              key={city.en}
              onPress={() => handleSelectCity(city)}
              style={({ pressed }) => ({
                flexDirection: rowDirectionForAppLayout(isRTL),
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 11,
                gap: 10,
                borderBottomWidth: idx < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderLight ?? colors.border,
                backgroundColor: pressed ? (colors.surfaceSecondary ?? colors.surfaceTertiary) : colors.surface,
              })}
            >
              <Ionicons name="location" size={14} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.text,
                    textAlign: isRTL ? "right" : "left",
                  }}
                  numberOfLines={1}
                >
                  {isRTL ? city.he : city.en}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  textAlign: isRTL ? "left" : "right",
                }}
                numberOfLines={1}
              >
                {isRTL ? city.en : city.he}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
