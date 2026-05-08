import { useState, useCallback } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Defers heavy UI rendering on every screen focus (initial mount AND subsequent
 * re-focuses after tab switches or stack navigation).
 *
 * On each focus event it immediately yields `false` (show skeleton), then waits
 * for all pending InteractionManager work (i.e. the navigation animation) to
 * complete before returning `true` (reveal full content).
 *
 * Use this instead of `useDeferredMount` for screens that are heavy enough to
 * noticeably block the navigation animation on EVERY visit, not just the first.
 */
export function useFocusDefer(): boolean {
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setReady(false);
      const task = InteractionManager.runAfterInteractions(() => {
        setReady(true);
      });
      return () => {
        task.cancel();
      };
    }, []),
  );

  return ready;
}
