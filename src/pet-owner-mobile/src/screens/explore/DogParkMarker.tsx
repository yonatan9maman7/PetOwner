import { memo, useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarkerWrapper } from "../../components/MapViewWrapper";

/**
 * Android Google Maps snapshots custom marker children when `tracksViewChanges`
 * flips to false. If frozen too early, the bitmap is empty. Start tracking,
 * then freeze after layout + paint (timeout; onLayout as a backup on Android).
 */
const SNAPSHOT_FREEZE_MS = Platform.OS === "android" ? 500 : 350;

export type DogParkMarkerProps = {
  coordinate: { latitude: number; longitude: number };
  onPress: () => void;
  zIndex?: number;
};

export const DogParkMarker = memo(function DogParkMarker({
  coordinate,
  onPress,
  zIndex = 400,
}: DogParkMarkerProps) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const freezeSnapshot = useCallback(() => {
    setTracksViewChanges(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(freezeSnapshot, SNAPSHOT_FREEZE_MS);
    return () => clearTimeout(timer);
  }, [freezeSnapshot]);

  return (
    <MarkerWrapper
      coordinate={coordinate}
      tracksViewChanges={tracksViewChanges}
      zIndex={zIndex}
      onPress={onPress}
    >
      <View style={styles.outer}>
        <Ionicons name="leaf" size={16} color="#fff" />
      </View>
    </MarkerWrapper>
  );
});

const styles = StyleSheet.create({
  /** No shadow* — MapKit / Google Maps snapshot custom children into a bitmap. */
  outer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
