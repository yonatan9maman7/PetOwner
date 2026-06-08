import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";

/**
 * Host for `react-native-toast-message`. The library keeps toast views mounted
 * (opacity 0 when hidden) inside an absolute container; without `pointerEvents="none"`
 * on the host when idle, that layer steals touches from the tab bar and map.
 */
export function AppToast() {
  const [active, setActive] = useState(false);

  return (
    <View
      pointerEvents={active ? "box-none" : "none"}
      style={[StyleSheet.absoluteFillObject, styles.host]}
    >
      <Toast
        onShow={() => setActive(true)}
        onHide={() => setActive(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    zIndex: 9999,
  },
});
