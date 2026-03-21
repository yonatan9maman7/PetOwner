import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { TermsModalComponent } from '../../shared/terms-modal/terms-modal.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, TermsModalComponent],
  template: `
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <button
        type="button"
        (click)="languageService.toggleLanguage()"
        class="absolute top-4 end-4 z-50 p-2 bg-white/80 rounded-full shadow-sm hover:bg-gray-100 transition-colors
               text-xs font-bold text-gray-700 tabular-nums"
        aria-label="Switch language">
        {{ languageService.currentLang() === 'he' ? 'EN' : 'HE' }}
      </button>
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ (isRegister() ? 'AUTH.CREATE_ACCOUNT' : 'AUTH.WELCOME_BACK') | translate }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ (isRegister() ? 'AUTH.SUBTITLE_REGISTER' : 'AUTH.SUBTITLE_LOGIN') | translate }}
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          @if (isRegister()) {
            <div>
              <label for="name" class="block text-start text-sm font-medium text-gray-700 mb-1">{{ 'AUTH.FULL_NAME' | translate }}</label>
              <input
                id="name"
                formControlName="name"
                type="text"
                dir="auto"
                [attr.placeholder]="'AUTH.PLACEHOLDER_NAME' | translate"
                class="w-full text-start placeholder:text-start px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent transition"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_NAME' | translate }}</span>
              }
            </div>
          }

          <div>
            <label for="email" class="block text-start text-sm font-medium text-gray-700 mb-1">{{ 'AUTH.EMAIL_ADDRESS' | translate }}</label>
            <input
              id="email"
              formControlName="email"
              type="email"
              dir="auto"
              [attr.placeholder]="'AUTH.PLACEHOLDER_EMAIL' | translate"
              class="w-full text-start placeholder:text-start px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_EMAIL' | translate }}</span>
            }
          </div>

          @if (isRegister()) {
            <div>
              <label for="phone" class="block text-start text-sm font-medium text-gray-700 mb-1">{{ 'AUTH.PHONE' | translate }}</label>
              <input
                id="phone"
                formControlName="phone"
                type="tel"
                dir="auto"
                [attr.placeholder]="'AUTH.PLACEHOLDER_PHONE' | translate"
                class="w-full text-start placeholder:text-start px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent transition"
              />
              @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
                <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_PHONE' | translate }}</span>
              }
            </div>
          }

          <div>
            <label for="password" class="block text-start text-sm font-medium text-gray-700 mb-1">{{ 'AUTH.PASSWORD' | translate }}</label>
            <input
              id="password"
              formControlName="password"
              type="password"
              dir="auto"
              [attr.placeholder]="'AUTH.PLACEHOLDER_PASSWORD' | translate"
              class="w-full text-start placeholder:text-start px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_PASSWORD' | translate }}</span>
            }
          </div>

          @if (isRegister()) {
            <div class="flex items-start gap-2">
              <input
                id="agreeTerms"
                formControlName="agreeTerms"
                type="checkbox"
                class="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label for="agreeTerms" class="text-sm text-start text-gray-600">
                {{ 'AUTH.TERMS_PREFIX' | translate }}
                <button
                  type="button"
                  (click)="termsModalOpen.set(true)"
                  class="text-indigo-600 hover:text-indigo-500 underline font-medium p-0 border-0 bg-transparent cursor-pointer inline">
                  {{ 'AUTH.TERMS_OF_SERVICE' | translate }}
                </button>
              </label>
            </div>
            @if (form.get('agreeTerms')?.invalid && form.get('agreeTerms')?.touched) {
              <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_TERMS' | translate }}</span>
            }
          }

          @if (!isRegister()) {
            <div class="text-start">
              <a routerLink="/forgot-password" class="text-sm text-indigo-600 font-medium hover:underline">
                {{ 'AUTH.FORGOT_PASSWORD' | translate }}
              </a>
            </div>
          }

          @if (errorMsg()) {
            <p class="text-start text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ errorMsg() }}</p>
          }

          <button
            type="submit"
            [disabled]="loading() || form.invalid"
            class="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold
                   hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
                   disabled:cursor-not-allowed transition"
          >
            {{ loading() ? ('AUTH.PLEASE_WAIT' | translate) : ((isRegister() ? 'AUTH.CREATE_ACCOUNT' : 'AUTH.SIGN_IN') | translate) }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          @if (isRegister()) {
            {{ 'AUTH.ALREADY_HAVE_ACCOUNT' | translate }}
            <button type="button" (click)="toggleMode()" class="text-indigo-600 font-medium hover:underline">{{ 'AUTH.LOGIN' | translate }}</button>
          } @else {
            {{ 'AUTH.NO_ACCOUNT' | translate }}
            <button type="button" (click)="toggleMode()" class="text-indigo-600 font-medium hover:underline">{{ 'AUTH.SIGN_UP' | translate }}</button>
          }
        </p>
      </div>
      <app-terms-modal [isOpen]="termsModalOpen()" (close)="termsModalOpen.set(false)" />
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly isRegister = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly termsModalOpen = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    agreeTerms: [false],
  });

  toggleMode(): void {
    this.isRegister.update((v) => !v);
    this.errorMsg.set('');
    this.form.reset({ name: '', email: '', phone: '', password: '', agreeTerms: false });

    if (this.isRegister()) {
      this.form.controls.name.setValidators([Validators.required]);
      this.form.controls.phone.setValidators([Validators.required, Validators.pattern(/^05\d{8}$/)]);
      this.form.controls.agreeTerms.setValidators([Validators.requiredTrue]);
    } else {
      this.form.controls.name.clearValidators();
      this.form.controls.phone.clearValidators();
      this.form.controls.agreeTerms.clearValidators();
    }
    this.form.controls.name.updateValueAndValidity();
    this.form.controls.phone.updateValueAndValidity();
    this.form.controls.agreeTerms.updateValueAndValidity();
  }

  onSubmit(): void {
    this.errorMsg.set('');

    if (this.isRegister()) {
      this.form.controls.name.setValidators([Validators.required]);
      this.form.controls.phone.setValidators([Validators.required, Validators.pattern(/^05\d{8}$/)]);
      this.form.controls.agreeTerms.setValidators([Validators.requiredTrue]);
    } else {
      this.form.controls.name.clearValidators();
      this.form.controls.phone.clearValidators();
      this.form.controls.agreeTerms.clearValidators();
    }
    this.form.controls.name.updateValueAndValidity();
    this.form.controls.phone.updateValueAndValidity();
    this.form.controls.agreeTerms.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, phone, password, name } = this.form.getRawValue();

    const request$ = this.isRegister()
      ? this.auth.register({ email, phone, password, name })
      : this.auth.login(email, password);

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          err.error?.message ?? this.translate.instant('AUTH.ERROR_GENERIC'),
        );
      },
    });
  }
}
