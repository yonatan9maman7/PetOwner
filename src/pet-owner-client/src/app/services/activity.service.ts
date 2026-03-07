import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Activity {
  id: string;
  petId: string;
  type: 'Walk' | 'Meal' | 'Exercise' | 'Weight';
  value: number | null;
  durationMinutes: number | null;
  notes: string | null;
  date: string;
  createdAt: string;
}

export interface CreateActivityPayload {
  type: string;
  value: number | null;
  durationMinutes: number | null;
  notes: string | null;
  date: string;
}

export interface WeightEntry {
  date: string;
  value: number;
}

export interface ActivitySummary {
  totalWalks: number;
  totalWalkMinutes: number;
  totalWalkDistance: number;
  totalMeals: number;
  totalExercises: number;
  totalExerciseMinutes: number;
  weightHistory: WeightEntry[];
  currentStreak: number;
  weeklyBreakdown: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);

  getAll(petId: string, days = 30, type?: string): Observable<Activity[]> {
    let url = `/api/pets/${petId}/activities?days=${days}`;
    if (type) url += `&type=${type}`;
    return this.http.get<Activity[]>(url);
  }

  create(petId: string, payload: CreateActivityPayload): Observable<Activity> {
    return this.http.post<Activity>(`/api/pets/${petId}/activities`, payload);
  }

  update(petId: string, id: string, payload: CreateActivityPayload): Observable<Activity> {
    return this.http.put<Activity>(`/api/pets/${petId}/activities/${id}`, payload);
  }

  delete(petId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/pets/${petId}/activities/${id}`);
  }

  getSummary(petId: string, days = 30): Observable<ActivitySummary> {
    return this.http.get<ActivitySummary>(`/api/pets/${petId}/activities/summary?days=${days}`);
  }
}
