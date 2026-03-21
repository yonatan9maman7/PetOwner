import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="min-h-full bg-slate-50 px-4 py-6 pb-24 md:pb-8">
      <div class="max-w-lg mx-auto">
        <header class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ 'PROFILE.MY_PROFILE' | translate }}</h1>
          <p class="mt-1 text-sm text-gray-500">{{ 'PROFILE.SETTINGS_SUBTITLE' | translate }}</p>
        </header>

        <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{{ 'PROFILE.SETTINGS' | translate }}</p>

        <nav
          class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          aria-label="User settings">
          <ul class="list-none p-0 m-0">
            <li>
              <a
                routerLink="/edit-profile"
                class="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors w-full text-start">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="h-10 w-10 shrink-0 rounded-xl bg-gray-100" aria-hidden="true"></span>
                  <span class="font-medium text-gray-900 truncate">{{ 'PROFILE.EDIT_PROFILE' | translate }}</span>
                </span>
                <span class="text-gray-400 text-lg leading-none shrink-0 ms-2 rtl:rotate-180" aria-hidden="true">&gt;</span>
              </a>
            </li>
            <li>
              <a
                routerLink="/my-pets"
                class="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors w-full text-start">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="h-10 w-10 shrink-0 rounded-xl bg-gray-100" aria-hidden="true"></span>
                  <span class="font-medium text-gray-900 truncate">{{ 'PROFILE.MY_PETS' | translate }}</span>
                </span>
                <span class="text-gray-400 text-lg leading-none shrink-0 ms-2 rtl:rotate-180" aria-hidden="true">&gt;</span>
              </a>
            </li>
            <li>
              <button
                type="button"
                class="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors w-full text-start">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="h-10 w-10 shrink-0 rounded-xl bg-gray-100" aria-hidden="true"></span>
                  <span class="font-medium text-gray-900 truncate">Payment Methods</span>
                </span>
                <span class="text-gray-400 text-lg leading-none shrink-0 ms-2 rtl:rotate-180" aria-hidden="true">&gt;</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                class="flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors w-full text-start">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="h-10 w-10 shrink-0 rounded-xl bg-gray-100" aria-hidden="true"></span>
                  <span class="font-medium text-gray-900 truncate">Notification Preferences</span>
                </span>
                <span class="text-gray-400 text-lg leading-none shrink-0 ms-2 rtl:rotate-180" aria-hidden="true">&gt;</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors w-full text-start">
                <span class="flex items-center gap-3 min-w-0">
                  <span class="h-10 w-10 shrink-0 rounded-xl bg-gray-100" aria-hidden="true"></span>
                  <span class="font-medium text-gray-900 truncate">Privacy Policy</span>
                </span>
                <span class="text-gray-400 text-lg leading-none shrink-0 ms-2 rtl:rotate-180" aria-hidden="true">&gt;</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  `,
})
export class UserProfileComponent {}
