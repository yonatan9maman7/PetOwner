import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SharedMedicalRecordsResponse {
  shared: boolean;
  records: MedicalRecord[];
}

export interface MedicalRecord {
  id: string;
  petId: string;
  type: string;
  title: string;
  description: string | null;
  date: string;
  documentUrl: string | null;
  createdAt: string;
}

export interface CreateMedicalRecordPayload {
  type: string;
  title: string;
  description: string | null;
  date: string;
  documentUrl: string | null;
}

export interface UpdateMedicalRecordPayload {
  type: string;
  title: string;
  description: string | null;
  date: string;
  documentUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  private readonly http = inject(HttpClient);

  getAll(petId: string): Observable<MedicalRecord[]> {
    return this.http.get<MedicalRecord[]>(`/api/pets/${petId}/medical-records`);
  }

  getOne(petId: string, id: string): Observable<MedicalRecord> {
    return this.http.get<MedicalRecord>(`/api/pets/${petId}/medical-records/${id}`);
  }

  create(petId: string, payload: CreateMedicalRecordPayload): Observable<MedicalRecord> {
    return this.http.post<MedicalRecord>(`/api/pets/${petId}/medical-records`, payload);
  }

  update(petId: string, id: string, payload: UpdateMedicalRecordPayload): Observable<MedicalRecord> {
    return this.http.put<MedicalRecord>(`/api/pets/${petId}/medical-records/${id}`, payload);
  }

  delete(petId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/pets/${petId}/medical-records/${id}`);
  }

  getSharedForBooking(bookingId: string): Observable<SharedMedicalRecordsResponse> {
    return this.http.get<SharedMedicalRecordsResponse>(`/api/bookings/${bookingId}/medical-records`);
  }
}
