import { useState, useEffect } from "react";
import { InteractionManager } from "react-native";

/**
 * Defers mounting of heavy UI subtrees until after the current navigation
 * transition (or any pending InteractionManager work) has completed.
 *
 * Returns `true` once it's safe to render the expensive tree.
 * Components should show a lightweight skeleton while this returns `false`.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    return () => task.cancel();
  }, []);

  return ready;
}
