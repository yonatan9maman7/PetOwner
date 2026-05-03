import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
  type ForwardRefRenderFunction,
} from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

const SCREEN_WIDTH = Dimensions.get("window").width;

/** Same dual-cannon celebration as AddPetScreen (manual `start()`, not auto). */
export type CelebrationConfettiBurstRef = {
  burst: () => void;
};

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
  },
});

const CelebrationConfettiBurstInner: ForwardRefRenderFunction<
  CelebrationConfettiBurstRef,
  object
> = (_props, ref) => {
  const leftRef: MutableRefObject<InstanceType<typeof ConfettiCannon> | null> =
    useRef(null);
  const rightRef: MutableRefObject<InstanceType<typeof ConfettiCannon> | null> =
    useRef(null);

  useImperativeHandle(ref, () => ({
    burst() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          leftRef.current?.start();
          rightRef.current?.start();
        });
      });
    },
  }));

  return (
    <View pointerEvents="none" style={styles.layer} collapsable={false}>
      <ConfettiCannon
        ref={leftRef}
        count={160}
        origin={{ x: SCREEN_WIDTH * 0.12, y: -24 }}
        autoStart={false}
        fadeOut
        fallSpeed={3250}
        explosionSpeed={420}
        colors={[
          "#7c3aed",
          "#0d9488",
          "#f59e0b",
          "#ec4899",
          "#001a5a",
          "#fef08a",
        ]}
      />
      <ConfettiCannon
        ref={rightRef}
        count={160}
        origin={{ x: SCREEN_WIDTH * 0.88, y: -24 }}
        autoStart={false}
        fadeOut
        fallSpeed={3250}
        explosionSpeed={420}
        colors={[
          "#7c3aed",
          "#0d9488",
          "#f59e0b",
          "#ec4899",
          "#001a5a",
          "#fef08a",
        ]}
      />
    </View>
  );
};

export const CelebrationConfettiBurst = forwardRef(CelebrationConfettiBurstInner);
