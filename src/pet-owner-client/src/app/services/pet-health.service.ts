import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vaccination {
  id: string;
  petId: string;
  vaccineName: string;
  dateAdministered: string;
  nextDueDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface VaccineStatus {
  vaccineName: string;
  dateAdministered: string;
  nextDueDate: string | null;
  status: 'Up to Date' | 'Due Soon' | 'Overdue';
}

export interface CreateVaccinationPayload {
  vaccineName: string;
  dateAdministered: string;
  nextDueDate: string | null;
  notes: string | null;
}

export interface UpdateVaccinationPayload {
  vaccineName: string;
  dateAdministered: string;
  nextDueDate: string | null;
  notes: string | null;
}

export interface WeightLog {
  id: string;
  petId: string;
  weight: number;
  dateRecorded: string;
  createdAt: string;
}

export interface CreateWeightLogPayload {
  weight: number;
  dateRecorded: string;
}

export const VACCINE_NAMES = [
  'Rabies', 'Parvo', 'Distemper', 'Hepatitis', 'Leptospirosis',
  'Bordetella', 'Lyme', 'Influenza', 'Worms', 'Fleas',
  'Ticks', 'FeLV', 'FIV', 'Other',
] as const;

@Injectable({ providedIn: 'root' })
export class PetHealthService {
  private readonly http = inject(HttpClient);

  // ── Vaccinations ──

  getVaccinations(petId: string): Observable<Vaccination[]> {
    return this.http.get<Vaccination[]>(`/api/pets/${petId}/vaccinations`);
  }

  getVaccineStatus(petId: string): Observable<VaccineStatus[]> {
    return this.http.get<VaccineStatus[]>(`/api/pets/${petId}/vaccine-status`);
  }

  createVaccination(petId: string, payload: CreateVaccinationPayload): Observable<Vaccination> {
    return this.http.post<Vaccination>(`/api/pets/${petId}/vaccinations`, payload);
  }

  updateVaccination(petId: string, id: string, payload: UpdateVaccinationPayload): Observable<Vaccination> {
    return this.http.put<Vaccination>(`/api/pets/${petId}/vaccinations/${id}`, payload);
  }

  deleteVaccination(petId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/pets/${petId}/vaccinations/${id}`);
  }

  // ── Weight Logs ──

  getWeightHistory(petId: string): Observable<WeightLog[]> {
    return this.http.get<WeightLog[]>(`/api/pets/${petId}/weight-history`);
  }

  createWeightLog(petId: string, payload: CreateWeightLogPayload): Observable<WeightLog> {
    return this.http.post<WeightLog>(`/api/pets/${petId}/weight-logs`, payload);
  }

  deleteWeightLog(petId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/pets/${petId}/weight-logs/${id}`);
  }

  // ── Medical Records ──

  getHealthRecords(petId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/pets/${petId}/health-records`);
  }
}
