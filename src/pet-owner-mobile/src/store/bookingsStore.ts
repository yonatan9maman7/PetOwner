import axios from "axios";
import { create } from "zustand";
import { bookingsApi } from "../api/client";
import type { BookingDto } from "../types/api";
import { getApiErrorMessage } from "../utils/apiUtils";

interface BookingsState {
  allBookings: BookingDto[];
  loading: boolean;
  error: string | null;
  /** Load `/bookings/mine`. When `silent` is true, initial full-screen loading is not toggled. */
  fetchMine: (options?: { silent?: boolean }) => Promise<void>;
  clearError: () => void;
}

export const useBookingsStore = create<BookingsState>((set) => ({
  allBookings: [],
  loading: true,
  error: null,

  fetchMine: async (options) => {
    const silent = options?.silent ?? false;
    if (!silent) set({ loading: true, error: null });
    try {
      const data = await bookingsApi.getMine();
      set({ allBookings: data, error: null });
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        return;
      }
      set((s) => ({
        error: getApiErrorMessage(e),
        allBookings: s.allBookings,
      }));
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
