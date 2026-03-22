import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface FavoriteProvider {
  userId: string;
  name: string;
  profileImageUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  isAvailableNow: boolean;
  services: string;
  minRate: number;
  favoritedAt: string;
}

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/favorites';

  readonly favoriteIds = signal<Set<string>>(new Set());

  toggle(providerProfileId: string): Observable<{ isFavorited: boolean }> {
    return this.http.post<{ isFavorited: boolean }>(
      `${this.baseUrl}/${providerProfileId}/toggle`,
      {}
    ).pipe(
      tap(res => {
        const ids = new Set(this.favoriteIds());
        if (res.isFavorited) {
          ids.add(providerProfileId);
        } else {
          ids.delete(providerProfileId);
        }
        this.favoriteIds.set(ids);
      })
    );
  }

  getMyFavorites(): Observable<FavoriteProvider[]> {
    return this.http.get<FavoriteProvider[]>(this.baseUrl);
  }

  loadFavoriteIds(): void {
    this.http.get<string[]>(`${this.baseUrl}/ids`).subscribe({
      next: ids => this.favoriteIds.set(new Set(ids)),
    });
  }

  isFavorited(providerProfileId: string): boolean {
    return this.favoriteIds().has(providerProfileId);
  }
}
