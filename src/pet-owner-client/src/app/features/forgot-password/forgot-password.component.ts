import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4" dir="ltr">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p class="text-sm text-gray-500 mt-1">Enter your email address to receive a reset link.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              id="email"
              formControlName="email"
              type="email"
              dir="auto"
              placeholder="you&#64;example.com"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-start placeholder:text-start text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="text-xs text-red-500">Please enter a valid email address</span>
            }
          </div>

          <button
            type="submit"
            [disabled]="loading() || form.invalid"
            class="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold
                   hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50
                   disabled:cursor-not-allowed transition"
          >
            {{ loading() ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          <a routerLink="/login" class="text-indigo-600 font-medium hover:underline">Back to Login</a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email } = this.form.getRawValue();

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('If the email exists, a reset link has been sent.');
        this.form.reset({ email: '' });
      },
      error: () => {
        this.loading.set(false);
        this.toast.success('If the email exists, a reset link has been sent.');
        this.form.reset({ email: '' });
      },
    });
  }
}
