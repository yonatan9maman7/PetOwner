import { create } from "zustand";
import { petsApi } from "../api/client";
import { getApiErrorMessage } from "../utils/apiUtils";
import type {
  PetDto,
  CreatePetRequest,
  UpdatePetRequest,
  ReportLostRequest,
} from "../types/api";

interface PetsState {
  pets: PetDto[];
  loading: boolean;
  error: string | null;
  fetchPets: () => Promise<void>;
  addPet: (data: CreatePetRequest) => Promise<void>;
  updatePet: (id: string, data: UpdatePetRequest) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  reportLost: (id: string, data: ReportLostRequest) => Promise<void>;
  markFound: (id: string) => Promise<void>;
  reset: () => void;
}

export const usePetsStore = create<PetsState>((set, get) => ({
  pets: [],
  loading: false,
  error: null,

  fetchPets: async () => {
    set({ loading: true, error: null });
    try {
      const pets = await petsApi.getMyPets();
      set({ pets, loading: false });
    } catch (e: unknown) {
      set({ error: getApiErrorMessage(e), loading: false });
    }
  },

  addPet: async (data) => {
    set({ loading: true, error: null });
    try {
      const pet = await petsApi.createPet(data);
      set({ pets: [...get().pets, pet], loading: false });
    } catch (e: unknown) {
      set({ error: getApiErrorMessage(e), loading: false });
      throw e;
    }
  },

  updatePet: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await petsApi.updatePet(id, data);
      set({
        pets: get().pets.map((p) => (p.id === id ? updated : p)),
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: getApiErrorMessage(e), loading: false });
      throw e;
    }
  },

  deletePet: async (id) => {
    set({ loading: true, error: null });
    try {
      await petsApi.deletePet(id);
      set({
        pets: get().pets.filter((p) => p.id !== id),
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: getApiErrorMessage(e), loading: false });
    }
  },

  reportLost: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updated = await petsApi.reportLost(id, data);
      set({
        pets: get().pets.map((p) => (p.id === id ? updated : p)),
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: getApiErrorMessage(e), loading: false });
    }
  },

  markFound: async (id) => {
    set({ loading: true, error: null });
    try {
      const updated = await petsApi.markFound(id);
      set({
        pets: get().pets.map((p) => (p.id === id ? updated : p)),
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: getApiErrorMessage(e), loading: false });
    }
  },

  reset: () => {
    set({ pets: [], loading: false, error: null });
  },
}));
