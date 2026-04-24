import { useEffect, useState, useRef } from "react";
import { medicalApi } from "../../../../api/client";
import { activitiesApi } from "../../../../api/activitiesApi";
import type { VaccineStatusDto, WeightLogDto, MedicalRecordDto, ActivitySummaryDto } from "../../../../types/api";

export interface ActivePetSummary {
  vaccineStatuses: VaccineStatusDto[];
  weightHistory: WeightLogDto[];
  medicalRecords: MedicalRecordDto[];
  activitySummary: ActivitySummaryDto | null;
  loading: boolean;
}

interface CacheEntry {
  nonce: number;
  data: Omit<ActivePetSummary, "loading">;
}

const cache = new Map<string, CacheEntry>();

const EMPTY: ActivePetSummary = {
  vaccineStatuses: [],
  weightHistory: [],
  medicalRecords: [],
  activitySummary: null,
  loading: false,
};

export function useActivePetSummary(
  petId: string | undefined | null,
  reloadNonce: number,
): ActivePetSummary {
  const [state, setState] = useState<ActivePetSummary>(EMPTY);
  const inflightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!petId) {
      setState(EMPTY);
      return;
    }

    const cacheKey = petId;
    const cached = cache.get(cacheKey);
    if (cached && cached.nonce === reloadNonce) {
      setState({ ...cached.data, loading: false });
      return;
    }

    const token = `${petId}:${reloadNonce}`;
    inflightRef.current = token;
    setState((prev) => ({ ...prev, loading: true }));

    Promise.all([
      medicalApi.getVaccineStatus(petId).catch(() => [] as VaccineStatusDto[]),
      medicalApi.getWeightHistory(petId).catch(() => [] as WeightLogDto[]),
      medicalApi.getMedicalRecords(petId).catch(() => [] as MedicalRecordDto[]),
      activitiesApi.getSummary(petId, 7).catch(() => null as ActivitySummaryDto | null),
    ]).then(([vaccineStatuses, weightHistory, medicalRecords, activitySummary]) => {
      if (inflightRef.current !== token) return;
      const data: Omit<ActivePetSummary, "loading"> = {
        vaccineStatuses,
        weightHistory,
        medicalRecords,
        activitySummary,
      };
      cache.set(cacheKey, { nonce: reloadNonce, data });
      setState({ ...data, loading: false });
    });
  }, [petId, reloadNonce]);

  return state;
}
