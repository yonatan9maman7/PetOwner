import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FavoriteService, FavoriteProvider } from '../../services/favorite.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="min-h-screen bg-gray-50 pb-24" dir="auto">
      <!-- Header -->
      <div class="bg-gradient-to-br from-rose-500 to-pink-600 text-white pt-14 pb-10 px-5">
        <h1 class="text-2xl font-bold text-start">{{ 'FAVORITES.TITLE' | translate }}</h1>
        <p class="text-sm text-white/70 mt-1 text-start">{{ 'FAVORITES.SUBTITLE' | translate }}</p>
      </div>

      <div class="px-4 -mt-6 max-w-2xl mx-auto">
        @if (loading()) {
          <div class="flex items-center justify-center py-16">
            <div class="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (favorites().length === 0) {
          <div class="bg-white rounded-2xl shadow-md p-8 text-center">
            <div class="text-5xl mb-4">💜</div>
            <h2 class="text-lg font-semibold text-gray-800 mb-2">{{ 'FAVORITES.EMPTY_TITLE' | translate }}</h2>
            <p class="text-sm text-gray-500 leading-relaxed">{{ 'FAVORITES.EMPTY' | translate }}</p>
            <button
              type="button"
              (click)="goToMap()"
              class="mt-6 inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600
                     text-white font-semibold rounded-xl py-3 px-6 text-sm transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {{ 'FAVORITES.BROWSE_MAP' | translate }}
            </button>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (fav of favorites(); track fav.userId) {
              <div class="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition-shadow">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center
                              text-xl shrink-0 overflow-hidden ring-2 ring-violet-200">
                    @if (fav.profileImageUrl) {
                      <img [src]="fav.profileImageUrl" [alt]="fav.name" class="w-full h-full object-cover" />
                    } @else {
                      🐾
                    }
                  </div>
                  <div class="min-w-0 flex-1 text-start">
                    <h3 class="font-semibold text-gray-900 truncate text-sm">{{ fav.name }}</h3>
                    <p class="text-xs text-violet-600 font-medium">{{ fav.services }}</p>
                    @if (fav.reviewCount > 0) {
                      <div class="flex items-center gap-1 mt-0.5">
                        <span class="text-amber-500 text-xs">&#9733;</span>
                        <span class="text-xs font-semibold text-gray-700">{{ fav.averageRating }}</span>
                        <span class="text-xs text-gray-400">({{ fav.reviewCount }})</span>
                      </div>
                    }
                  </div>
                  <button
                    type="button"
                    (click)="unfavorite(fav.userId); $event.stopPropagation()"
                    class="shrink-0 p-1.5 rounded-full hover:bg-red-50 transition-colors">
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                  </button>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    @if (fav.isAvailableNow) {
                      <span class="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {{ 'DASHBOARD.ONLINE' | translate }}
                      </span>
                    }
                    @if (fav.minRate > 0) {
                      <span dir="auto">{{ 'DASHBOARD.SHEET_STARTING_AT' | translate }} ₪{{ fav.minRate }}</span>
                    }
                  </div>
                  <button
                    type="button"
                    (click)="viewProfile(fav.userId)"
                    class="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                    {{ 'BOOKING.SHEET_PROFILE' | translate }}
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class FavoritesComponent implements OnInit {
  private readonly favoriteService = inject(FavoriteService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  favorites = signal<FavoriteProvider[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.favoriteService.getMyFavorites().subscribe({
      next: (list) => {
        this.favorites.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  unfavorite(providerId: string): void {
    this.favoriteService.toggle(providerId).subscribe({
      next: () => {
        this.favorites.update(list => list.filter(f => f.userId !== providerId));
      },
    });
  }

  viewProfile(providerId: string): void {
    this.router.navigate(['/provider', providerId]);
  }

  goToMap(): void {
    this.router.navigate(['/']);
  }
}
