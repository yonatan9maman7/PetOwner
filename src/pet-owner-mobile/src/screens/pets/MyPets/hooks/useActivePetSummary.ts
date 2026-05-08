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
const inflight = new Map<string, Promise<Omit<ActivePetSummary, "loading">>>();

const EMPTY: ActivePetSummary = {
  vaccineStatuses: [],
  weightHistory: [],
  medicalRecords: [],
  activitySummary: null,
  loading: false,
};

function getInflightKey(petId: string, reloadNonce: number): string {
  return `${petId}:${reloadNonce}`;
}

function fetchSummaryData(petId: string, reloadNonce: number): Promise<Omit<ActivePetSummary, "loading">> {
  const inflightKey = getInflightKey(petId, reloadNonce);
  const existing = inflight.get(inflightKey);
  if (existing) return existing;

  const bg = { backgroundRequest: true } as const;
  const request = Promise.all([
    medicalApi.getVaccineStatus(petId, bg).catch(() => [] as VaccineStatusDto[]),
    medicalApi.getWeightHistory(petId, bg).catch(() => [] as WeightLogDto[]),
    medicalApi.getMedicalRecords(petId, bg).catch(() => [] as MedicalRecordDto[]),
    activitiesApi.getSummary(petId, 7, bg).catch(() => null as ActivitySummaryDto | null),
  ])
    .then(([vaccineStatuses, weightHistory, medicalRecords, activitySummary]) => {
      const data: Omit<ActivePetSummary, "loading"> = {
        vaccineStatuses,
        weightHistory,
        medicalRecords,
        activitySummary,
      };
      cache.set(petId, { nonce: reloadNonce, data });
      return data;
    })
    .finally(() => {
      inflight.delete(inflightKey);
    });

  inflight.set(inflightKey, request);
  return request;
}

export function prefetchActivePetSummary(petId: string, reloadNonce: number): Promise<void> {
  const cached = cache.get(petId);
  if (cached && cached.nonce === reloadNonce) return Promise.resolve();
  return fetchSummaryData(petId, reloadNonce).then(() => undefined);
}

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

    fetchSummaryData(petId, reloadNonce).then((data) => {
      if (inflightRef.current !== token) return;
      setState({ ...data, loading: false });
    });
  }, [petId, reloadNonce]);

  return state;
}
