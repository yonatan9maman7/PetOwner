import { NgClass } from '@angular/common';
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
  imports: [NgClass, ReactiveFormsModule, RouterLink, TranslatePipe, TermsModalComponent],
  template: `
    <div
      class="relative flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4"
      [ngClass]="
        isRegister()
          ? 'min-h-[100dvh] max-h-[100dvh] py-3'
          : 'min-h-screen py-6'
      ">
      <a
        routerLink="/"
        class="absolute top-4 start-4 z-50 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600
               transition-colors hover:bg-white/80 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        [attr.aria-label]="'AUTH.BACK_TO_MAP' | translate">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 shrink-0 rtl:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>{{ 'AUTH.BACK_TO_MAP' | translate }}</span>
      </a>
      <button
        type="button"
        (click)="languageService.toggleLanguage()"
        class="absolute top-4 end-4 z-50 p-2 bg-white/80 rounded-full shadow-sm hover:bg-gray-100 transition-colors
               text-xs font-bold text-gray-700 tabular-nums"
        aria-label="Switch language">
        {{ languageService.currentLang() === 'he' ? 'EN' : 'HE' }}
      </button>
      <div
        class="w-full max-w-sm"
        [ngClass]="isRegister() ? 'flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overscroll-y-contain' : ''">
        <div [ngClass]="isRegister() ? 'mb-3 text-center' : 'mb-8 text-center'">
          <a
            routerLink="/"
            class="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl"
            [attr.aria-label]="'AUTH.HOME_LOGO_ARIA' | translate">
            <div
              [ngClass]="
                isRegister()
                  ? 'mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white'
                  : 'mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white'
              ">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                [ngClass]="isRegister() ? 'h-5 w-5' : 'h-7 w-7'"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </a>
          <h1 [ngClass]="isRegister() ? 'text-xl font-bold text-gray-900' : 'text-2xl font-bold text-gray-900'">
            {{ (isRegister() ? 'AUTH.CREATE_ACCOUNT' : 'AUTH.WELCOME_BACK') | translate }}
          </h1>
          <p [ngClass]="isRegister() ? 'mt-0.5 text-xs text-gray-500' : 'mt-1 text-sm text-gray-500'">
            {{ (isRegister() ? 'AUTH.SUBTITLE_REGISTER' : 'AUTH.SUBTITLE_LOGIN') | translate }}
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" [ngClass]="isRegister() ? 'space-y-2' : 'space-y-4'">
          @if (isRegister()) {
            <div>
              <label for="name" class="mb-0.5 block text-start text-xs font-medium text-gray-700">{{ 'AUTH.FULL_NAME' | translate }}</label>
              <input
                id="name"
                formControlName="name"
                type="text"
                dir="auto"
                [attr.placeholder]="'AUTH.PLACEHOLDER_NAME' | translate"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-start text-sm text-gray-900 placeholder:text-start
                       placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_NAME' | translate }}</span>
              }
            </div>
          }

          <div>
            <label
              for="email"
              [ngClass]="isRegister() ? 'mb-0.5 block text-start text-xs font-medium text-gray-700' : 'mb-1 block text-start text-sm font-medium text-gray-700'">{{
              'AUTH.EMAIL_ADDRESS' | translate
            }}</label>
            <input
              id="email"
              formControlName="email"
              type="email"
              dir="auto"
              [attr.placeholder]="'AUTH.PLACEHOLDER_EMAIL' | translate"
              [ngClass]="
                isRegister()
                  ? 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-start text-sm text-gray-900 placeholder:text-start placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  : 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-start text-gray-900 placeholder:text-start placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'
              "
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_EMAIL' | translate }}</span>
            }
          </div>

          @if (isRegister()) {
            <div>
              <label for="phone" class="mb-0.5 block text-start text-xs font-medium text-gray-700">{{ 'AUTH.PHONE' | translate }}</label>
              <input
                id="phone"
                formControlName="phone"
                type="tel"
                dir="auto"
                [attr.placeholder]="'AUTH.PLACEHOLDER_PHONE' | translate"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-start text-sm text-gray-900 placeholder:text-start
                       placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
                <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_PHONE' | translate }}</span>
              }
            </div>
          }

          <div>
            <label
              for="password"
              [ngClass]="isRegister() ? 'mb-0.5 block text-start text-xs font-medium text-gray-700' : 'mb-1 block text-start text-sm font-medium text-gray-700'">{{
              'AUTH.PASSWORD' | translate
            }}</label>
            <input
              id="password"
              formControlName="password"
              type="password"
              dir="auto"
              [attr.placeholder]="'AUTH.PLACEHOLDER_PASSWORD' | translate"
              [ngClass]="
                isRegister()
                  ? 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-start text-sm text-gray-900 placeholder:text-start placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  : 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-start text-gray-900 placeholder:text-start placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500'
              "
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="block text-start text-xs text-red-500">{{ 'AUTH.ERROR_PASSWORD' | translate }}</span>
            }
          </div>

          @if (isRegister()) {
            <div class="flex items-start gap-1.5">
              <input
                id="agreeTerms"
                formControlName="agreeTerms"
                type="checkbox"
                class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label for="agreeTerms" class="text-start text-xs text-gray-600 leading-snug">
                {{ 'AUTH.TERMS_PREFIX' | translate }}
                <button
                  type="button"
                  (click)="termsModalOpen.set(true)"
                  class="inline border-0 bg-transparent p-0 font-medium text-indigo-600 underline hover:text-indigo-500">
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
            <p
              [ngClass]="
                isRegister()
                  ? 'rounded-lg bg-red-50 px-2 py-1.5 text-start text-xs text-red-600'
                  : 'rounded-lg bg-red-50 px-3 py-2 text-start text-sm text-red-600'
              ">
              {{ errorMsg() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="loading() || form.invalid"
            [ngClass]="
              isRegister()
                ? 'w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50'
                : 'w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50'
            ">
            {{ loading() ? ('AUTH.PLEASE_WAIT' | translate) : ((isRegister() ? 'AUTH.CREATE_ACCOUNT' : 'AUTH.SIGN_IN') | translate) }}
          </button>
        </form>

        <p [ngClass]="isRegister() ? 'mt-2 text-center text-xs text-gray-500' : 'mt-6 text-center text-sm text-gray-500'">
          @if (isRegister()) {
            {{ 'AUTH.ALREADY_HAVE_ACCOUNT' | translate }}
            <button type="button" (click)="toggleMode()" class="font-medium text-indigo-600 hover:underline">{{ 'AUTH.LOGIN' | translate }}</button>
          } @else {
            {{ 'AUTH.NO_ACCOUNT' | translate }}
            <button type="button" (click)="toggleMode()" class="font-medium text-indigo-600 hover:underline">{{ 'AUTH.SIGN_UP' | translate }}</button>
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
      ? this.auth.register({ email, phone, password, name, languagePreference: this.languageService.currentLang() })
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
