import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Pet {
  id: string;
  name: string;
  species: string;
  age: number;
  notes: string | null;
  breed?: string;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  isNeutered?: boolean;
}

export interface CreatePetPayload {
  name: string;
  species: string;
  age: number;
  notes: string | null;
  breed?: string;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  isNeutered?: boolean;
}

export interface UpdatePetPayload {
  name: string;
  species: string;
  age: number;
  notes: string | null;
  breed?: string;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  isNeutered?: boolean;
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
}
