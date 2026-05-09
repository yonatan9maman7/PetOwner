import { useState, useCallback, useRef } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Defers heavy UI rendering only on FIRST mount. Subsequent re-focuses skip
 * the spinner since the component tree is already built and cached by
 * freezeOnBlur. This prevents the "flash of loading" on every tab switch.
 */
export function useFocusDefer(): boolean {
  const [ready, setReady] = useState(false);
  const mountedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (mountedOnce.current) {
        setReady(true);
        return;
      }
      setReady(false);
      const task = InteractionManager.runAfterInteractions(() => {
        mountedOnce.current = true;
        setReady(true);
      });
      return () => {
        task.cancel();
      };
    }, []),
  );

  return ready;
}

/**
 * Tracks whether this screen is currently focused. Use as a guard in async
 * callbacks to abort state updates (and avoid ghost work) once the user
 * leaves the tab.
 */
export function useFocusedRef(): React.MutableRefObject<boolean> {
  const ref = useRef(false);

  useFocusEffect(
    useCallback(() => {
      ref.current = true;
      return () => {
        ref.current = false;
      };
    }, []),
  );

  return ref;
}
