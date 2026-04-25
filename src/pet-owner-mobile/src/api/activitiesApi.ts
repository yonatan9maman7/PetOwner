import type { AxiosRequestConfig } from "axios";
import apiClient from "./client";
import type {
  ActivityDto,
  ActivitySummaryDto,
  CreateActivityDto,
  UpdateActivityDto,
} from "../types/api";

export type ActivitiesListParams = {
  type?: string;
  days?: number;
};

/**
 * REST: `/api/pets/{petId}/activities` (+ `.../summary`).
 * @see ActivitiesController.cs
 */
export const activitiesApi = {
  getList: (petId: string, params?: ActivitiesListParams) =>
    apiClient
      .get<ActivityDto[]>(`/pets/${petId}/activities`, {
        params,
        skipGlobalErrorToast: true,
      })
      .then((r) => r.data),

  getSummary: (petId: string, days?: number, cfg?: AxiosRequestConfig) =>
    apiClient
      .get<ActivitySummaryDto>(`/pets/${petId}/activities/summary`, {
        params: days != null ? { days } : undefined,
        skipGlobalErrorToast: true,
        ...cfg,
      })
      .then((r) => r.data),

  create: (petId: string, data: CreateActivityDto) =>
    apiClient.post<ActivityDto>(`/pets/${petId}/activities`, data).then((r) => r.data),

  update: (petId: string, activityId: string, data: UpdateActivityDto) =>
    apiClient.put<ActivityDto>(`/pets/${petId}/activities/${activityId}`, data).then((r) => r.data),

  delete: (petId: string, activityId: string) =>
    apiClient.delete(`/pets/${petId}/activities/${activityId}`).then((r) => r.data),
};
