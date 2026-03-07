import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Pet {
  id: string;
  name: string;
  species: string;
  age: number;
  notes: string | null;
}

export interface CreatePetPayload {
  name: string;
  species: string;
  age: number;
  notes: string | null;
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

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
