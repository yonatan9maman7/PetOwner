import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4"
      dir="auto">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 text-start">{{ 'AUTH.RESET_PASSWORD_TITLE' | translate }}</h1>
          <p class="text-sm text-gray-500 mt-1 text-start">{{ 'AUTH.RESET_PASSWORD_SUBTITLE' | translate }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1 text-start">{{ 'AUTH.NEW_PASSWORD' | translate }}</label>
            <div
              class="relative"
              [attr.dir]="languageService.currentLang() === 'he' ? 'rtl' : 'ltr'">
              <input
                id="newPassword"
                formControlName="newPassword"
                [type]="showNewPassword() ? 'text' : 'password'"
                [attr.dir]="languageService.currentLang() === 'he' ? 'rtl' : 'ltr'"
                [attr.placeholder]="'AUTH.PLACEHOLDER_PASSWORD' | translate"
                class="w-full py-3 ps-4 pe-12 rounded-xl border border-gray-300 bg-white text-start placeholder:text-start text-gray-900
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent transition"
              />
              <button
                type="button"
                (click)="showNewPassword.set(!showNewPassword())"
                class="absolute inset-y-0 end-0 z-10 flex w-11 items-center justify-center text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-e-xl"
                [attr.aria-label]="(showNewPassword() ? 'AUTH.HIDE_PASSWORD' : 'AUTH.SHOW_PASSWORD') | translate"
                [attr.aria-pressed]="showNewPassword()">
                @if (showNewPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
            @if (form.get('newPassword')?.invalid && form.get('newPassword')?.touched) {
              <span class="text-xs text-red-500 text-start block">{{ 'AUTH.ERROR_PASSWORD' | translate }}</span>
            }
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1 text-start">{{ 'AUTH.CONFIRM_PASSWORD' | translate }}</label>
            <div
              class="relative"
              [attr.dir]="languageService.currentLang() === 'he' ? 'rtl' : 'ltr'">
              <input
                id="confirmPassword"
                formControlName="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                [attr.dir]="languageService.currentLang() === 'he' ? 'rtl' : 'ltr'"
                [attr.placeholder]="'AUTH.PLACEHOLDER_PASSWORD' | translate"
                class="w-full py-3 ps-4 pe-12 rounded-xl border border-gray-300 bg-white text-start placeholder:text-start text-gray-900
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent transition"
              />
              <button
                type="button"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
                class="absolute inset-y-0 end-0 z-10 flex w-11 items-center justify-center text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-e-xl"
                [attr.aria-label]="(showConfirmPassword() ? 'AUTH.HIDE_PASSWORD' : 'AUTH.SHOW_PASSWORD') | translate"
                [attr.aria-pressed]="showConfirmPassword()">
                @if (showConfirmPassword()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              </button>
            </div>
            @if (form.get('confirmPassword')?.touched && form.hasError('passwordsMismatch')) {
              <span class="text-xs text-red-500 text-start block">{{ 'AUTH.PASSWORDS_MISMATCH' | translate }}</span>
            }
          </div>

          @if (errorMsg()) {
            <p class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-start">{{ errorMsg() }}</p>
          }

          <button
            type="submit"
            [disabled]="loading() || form.invalid"
            class="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold
                   hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
                   disabled:cursor-not-allowed transition"
          >
            {{ loading() ? ('AUTH.SAVING_PASSWORD' | translate) : ('AUTH.SAVE_PASSWORD' | translate) }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          <a routerLink="/login" class="text-indigo-600 font-medium hover:underline">{{ 'AUTH.BACK_TO_LOGIN' | translate }}</a>
        </p>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  private token = '';
  private email = '';

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [this.passwordsMatchValidator] },
  );

  ngOnInit(): void {
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      this.token = params['token'] ?? '';
      this.email = params['email'] ?? '';

      if (!this.token || !this.email) {
        void this.router.navigateByUrl('/login');
      }
    });
  }

  onSubmit(): void {
    this.errorMsg.set('');

    if (!this.token || !this.email) {
      void this.router.navigateByUrl('/login');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { newPassword } = this.form.getRawValue();

    this.auth.resetPassword({ email: this.email, token: this.token, newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success(this.translate.instant('AUTH.RESET_SUCCESS'));
        setTimeout(() => {
          void this.router.navigateByUrl('/login');
        }, 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          err.error?.message ?? this.translate.instant('AUTH.RESET_INVALID_TOKEN'),
        );
      },
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword');
    const confirm = control.get('confirmPassword');
    if (password && confirm && password.value !== confirm.value) {
      return { passwordsMismatch: true };
    }
    return null;
  }
}
