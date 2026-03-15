import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4" dir="ltr">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p class="text-sm text-gray-500 mt-1">Enter your new password below.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              id="newPassword"
              formControlName="newPassword"
              type="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
            />
            @if (form.get('newPassword')?.invalid && form.get('newPassword')?.touched) {
              <span class="text-xs text-red-500">Password must be at least 6 characters</span>
            }
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              id="confirmPassword"
              formControlName="confirmPassword"
              type="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
            />
            @if (form.get('confirmPassword')?.touched && form.hasError('passwordsMismatch')) {
              <span class="text-xs text-red-500">Passwords do not match</span>
            }
          </div>

          @if (errorMsg()) {
            <p class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ errorMsg() }}</p>
          }

          <button
            type="submit"
            [disabled]="loading() || form.invalid"
            class="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold
                   hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
                   disabled:cursor-not-allowed transition"
          >
            {{ loading() ? 'Resetting...' : 'Reset My Password' }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          <a routerLink="/login" class="text-indigo-600 font-medium hover:underline">Back to Login</a>
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

  readonly loading = signal(false);
  readonly errorMsg = signal('');

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
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';

    if (!this.token || !this.email) {
      this.router.navigateByUrl('/login');
    }
  }

  onSubmit(): void {
    this.errorMsg.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { newPassword } = this.form.getRawValue();

    this.auth.resetPassword({ email: this.email, token: this.token, newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Password successfully reset.');
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'The link is invalid or has expired. Please request a new one.');
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
