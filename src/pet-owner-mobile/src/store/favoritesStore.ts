import { create } from "zustand";
import { favoritesApi } from "../api/client";
import type { FavoriteProviderDto } from "../types/api";

interface FavoritesState {
  ids: Set<string>;
  providers: FavoriteProviderDto[];
  loading: boolean;
  error: string | null;

  fetchIds: () => Promise<void>;
  fetchProviders: () => Promise<void>;
  toggle: (providerId: string) => Promise<void>;
  isFavorited: (providerId: string) => boolean;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  providers: [],
  loading: false,
  error: null,

  fetchIds: async () => {
    try {
      const data = await favoritesApi.getIds();
      set({ ids: new Set(data) });
    } catch {
      /* silent — non-critical bootstrap call */
    }
  },

  fetchProviders: async () => {
    set({ loading: true, error: null });
    try {
      const data = await favoritesApi.getAll();
      set({
        providers: data,
        ids: new Set(
          data.map((p) => p.providerId ?? p.userId).filter(Boolean),
        ),
        loading: false,
      });
    } catch {
      set({ loading: false, error: "fetchFailed" });
    }
  },

  toggle: async (providerId: string) => {
    const prev = get().ids;
    const wasFavorited = prev.has(providerId);

    // Optimistic update
    const next = new Set(prev);
    if (wasFavorited) next.delete(providerId);
    else next.add(providerId);
    set({ ids: next });

    try {
      const { isFavorited } = await favoritesApi.toggle(providerId);
      const corrected = new Set(get().ids);
      if (isFavorited) corrected.add(providerId);
      else corrected.delete(providerId);
      set({ ids: corrected });
    } catch {
      // Revert on failure
      set({ ids: prev });
    }
  },

  isFavorited: (providerId: string) => get().ids.has(providerId),

  reset: () => set({ ids: new Set(), providers: [], loading: false, error: null }),
}));
