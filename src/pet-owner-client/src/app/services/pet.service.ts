import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PetSpecies } from '../models/pet-species.model';

export interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  age: number;
  notes: string | null;
  breed?: string;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  isNeutered?: boolean;
  medicalNotes?: string;
  feedingSchedule?: string;
  microchipNumber?: string;
  vetName?: string;
  vetPhone?: string;
  imageUrl?: string;
  isLost?: boolean;
  lastSeenLocation?: string;
  lastSeenLat?: number;
  lastSeenLng?: number;
  lostAt?: string;
  contactPhone?: string;
  communityPostId?: string;
}

export interface LostPet {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  imageUrl: string | null;
  lastSeenLocation: string;
  lastSeenLat: number;
  lastSeenLng: number;
  lostAt: string | null;
  contactPhone: string;
  ownerName: string;
}

export interface ReportLostPayload {
  lastSeenLocation: string;
  lastSeenLat: number;
  lastSeenLng: number;
  contactPhone: string;
}

export interface CreatePetPayload {
  name: string;
  species: PetSpecies;
  age: number;
  notes: string | null;
  breed?: string;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  isNeutered?: boolean;
  medicalNotes?: string;
  feedingSchedule?: string;
  microchipNumber?: string;
  vetName?: string;
  vetPhone?: string;
}

export interface UpdatePetPayload {
  name: string;
  species: PetSpecies;
  age: number;
  notes: string | null;
  breed?: string;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  isNeutered?: boolean;
  medicalNotes?: string;
  feedingSchedule?: string;
  microchipNumber?: string;
  vetName?: string;
  vetPhone?: string;
}

@Injectable({ providedIn: 'root' })
export class PetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/pets';

  getAll(): Observable<Pet[]> {
    return this.http.get<Pet[]>(this.baseUrl);
  }

  create(payload: CreatePetPayload): Observable<Pet> {
    return this.http.post<Pet>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdatePetPayload): Observable<Pet> {
    return this.http.put<Pet>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  reportLost(id: string, payload: ReportLostPayload): Observable<Pet> {
    return this.http.post<Pet>(`${this.baseUrl}/${id}/report-lost`, payload);
  }

  markFound(id: string): Observable<Pet> {
    return this.http.post<Pet>(`${this.baseUrl}/${id}/mark-found`, {});
  }

  getLostPets(): Observable<LostPet[]> {
    return this.http.get<LostPet[]>(`${this.baseUrl}/lost`);
  }
}
