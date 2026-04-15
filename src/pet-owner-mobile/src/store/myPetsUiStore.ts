import { create } from "zustand";

/** When true, MyPetsScreen is showing a health-passport section (not the main dashboard). Used to hide GlobalSosFab. */
interface MyPetsUiState {
  sectionDetailOpen: boolean;
  setSectionDetailOpen: (open: boolean) => void;
}

export const useMyPetsUiStore = create<MyPetsUiState>((set) => ({
  sectionDetailOpen: false,
  setSectionDetailOpen: (open) => set({ sectionDetailOpen: open }),
}));
