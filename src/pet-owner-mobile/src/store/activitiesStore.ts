import { create } from "zustand";
import { activitiesApi, type ActivitiesListParams } from "../api/activitiesApi";
import type { ActivityDto, ActivitySummaryDto, CreateActivityDto, UpdateActivityDto } from "../types/api";
import { getApiErrorMessage } from "../utils/apiUtils";

type PetBucket = {
  items: ActivityDto[];
  summary: ActivitySummaryDto | null;
  loading: boolean;
  summaryLoading: boolean;
  error: string | null;
};

function emptyBucket(): PetBucket {
  return {
    items: [],
    summary: null,
    loading: false,
    summaryLoading: false,
    error: null,
  };
}

interface ActivitiesState {
  byPetId: Record<string, PetBucket>;

  fetchActivities: (petId: string, params?: ActivitiesListParams) => Promise<void>;
  fetchSummary: (petId: string, days?: number) => Promise<void>;
  createActivity: (petId: string, data: CreateActivityDto) => Promise<ActivityDto | null>;
  updateActivity: (
    petId: string,
    activityId: string,
    data: UpdateActivityDto,
  ) => Promise<ActivityDto | null>;
  removeActivity: (petId: string, activityId: string) => Promise<boolean>;
  clearPet: (petId: string) => void;
}

function ensureBucket(
  byPetId: Record<string, PetBucket>,
  petId: string,
): { next: Record<string, PetBucket>; bucket: PetBucket } {
  const existing = byPetId[petId];
  if (existing) return { next: byPetId, bucket: existing };
  const bucket = emptyBucket();
  return { next: { ...byPetId, [petId]: bucket }, bucket };
}

export const useActivitiesStore = create<ActivitiesState>((set, get) => ({
  byPetId: {},

  fetchActivities: async (petId, params) => {
    const { next, bucket } = ensureBucket(get().byPetId, petId);
    set({
      byPetId: {
        ...next,
        [petId]: { ...bucket, loading: true, error: null },
      },
    });
    try {
      const items = await activitiesApi.getList(petId, params);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...(s.byPetId[petId] ?? emptyBucket()),
            items,
            loading: false,
            error: null,
          },
        },
      }));
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...(s.byPetId[petId] ?? emptyBucket()),
            loading: false,
            error: msg,
          },
        },
      }));
    }
  },

  fetchSummary: async (petId, days) => {
    const { next, bucket } = ensureBucket(get().byPetId, petId);
    set({
      byPetId: {
        ...next,
        [petId]: { ...bucket, summaryLoading: true, error: null },
      },
    });
    try {
      const summary = await activitiesApi.getSummary(petId, days);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...(s.byPetId[petId] ?? emptyBucket()),
            summary,
            summaryLoading: false,
            error: null,
          },
        },
      }));
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: {
            ...(s.byPetId[petId] ?? emptyBucket()),
            summaryLoading: false,
            error: msg,
          },
        },
      }));
    }
  },

  createActivity: async (petId, data) => {
    try {
      const created = await activitiesApi.create(petId, data);
      set((s) => {
        const b = s.byPetId[petId] ?? emptyBucket();
        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...b,
              items: [created, ...b.items],
              error: null,
            },
          },
        };
      });
      return created;
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: { ...(s.byPetId[petId] ?? emptyBucket()), error: msg },
        },
      }));
      return null;
    }
  },

  updateActivity: async (petId, activityId, data) => {
    try {
      const updated = await activitiesApi.update(petId, activityId, data);
      set((s) => {
        const b = s.byPetId[petId] ?? emptyBucket();
        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...b,
              items: b.items.map((a) => (a.id === activityId ? updated : a)),
              error: null,
            },
          },
        };
      });
      return updated;
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: { ...(s.byPetId[petId] ?? emptyBucket()), error: msg },
        },
      }));
      return null;
    }
  },

  removeActivity: async (petId, activityId) => {
    try {
      await activitiesApi.delete(petId, activityId);
      set((s) => {
        const b = s.byPetId[petId] ?? emptyBucket();
        return {
          byPetId: {
            ...s.byPetId,
            [petId]: {
              ...b,
              items: b.items.filter((a) => a.id !== activityId),
              error: null,
            },
          },
        };
      });
      return true;
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e);
      set((s) => ({
        byPetId: {
          ...s.byPetId,
          [petId]: { ...(s.byPetId[petId] ?? emptyBucket()), error: msg },
        },
      }));
      return false;
    }
  },

  clearPet: (petId) => {
    set((s) => {
      const { [petId]: _, ...rest } = s.byPetId;
      return { byPetId: rest };
    });
  },
}));
