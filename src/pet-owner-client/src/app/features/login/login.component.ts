import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4" dir="rtl">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ isRegister() ? 'יצירת חשבון' : 'ברוכים הבאים' }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ isRegister() ? 'הירשמו כדי להתחיל' : 'התחברו לחשבון שלכם' }}
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          @if (isRegister()) {
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
              <input
                id="name"
                formControlName="name"
                type="text"
                placeholder="השם שלך"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent transition text-right"
              />
              @if (form.get('name')?.invalid && form.get('name')?.touched) {
                <span class="text-xs text-red-500">שם מלא הוא שדה חובה</span>
              }
            </div>
          }

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              id="email"
              formControlName="email"
              type="email"
              placeholder="you&#64;example.com"
              dir="ltr"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition text-left"
            />
            @if (form.get('email')?.invalid && form.get('email')?.touched) {
              <span class="text-xs text-red-500">יש להזין כתובת אימייל תקינה</span>
            }
          </div>

          @if (isRegister()) {
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
              <input
                id="phone"
                formControlName="phone"
                type="tel"
                placeholder="05X-XXXXXXX"
                dir="ltr"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       focus:border-transparent transition text-left"
              />
              @if (form.get('phone')?.invalid && form.get('phone')?.touched) {
                <span class="text-xs text-red-500">יש להזין מספר טלפון תקין (לדוגמה 05XXXXXXXX)</span>
              }
            </div>
          }

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input
              id="password"
              formControlName="password"
              type="password"
              placeholder="••••••••"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                     placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                     focus:border-transparent transition"
            />
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <span class="text-xs text-red-500">הסיסמה חייבת להכיל לפחות 6 תווים</span>
            }
          </div>

          @if (!isRegister()) {
            <div class="text-start">
              <a routerLink="/forgot-password" class="text-sm text-indigo-600 font-medium hover:underline">
                שכחתי סיסמה
              </a>
            </div>
          }

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
            {{ loading() ? 'אנא המתינו...' : (isRegister() ? 'יצירת חשבון' : 'התחברות') }}
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          @if (isRegister()) {
            כבר יש לכם חשבון?
            <button (click)="toggleMode()" class="text-indigo-600 font-medium hover:underline">התחברות</button>
          } @else {
            אין לכם חשבון?
            <button (click)="toggleMode()" class="text-indigo-600 font-medium hover:underline">הרשמה</button>
          }
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isRegister = signal(false);
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  toggleMode(): void {
    this.isRegister.update((v) => !v);
    this.errorMsg.set('');
    this.form.reset({ name: '', email: '', phone: '', password: '' });

    if (this.isRegister()) {
      this.form.controls.name.setValidators([Validators.required]);
      this.form.controls.phone.setValidators([Validators.required, Validators.pattern(/^05\d{8}$/)]);
    } else {
      this.form.controls.name.clearValidators();
      this.form.controls.phone.clearValidators();
    }
    this.form.controls.name.updateValueAndValidity();
    this.form.controls.phone.updateValueAndValidity();
  }

  onSubmit(): void {
    this.errorMsg.set('');

    if (this.isRegister()) {
      this.form.controls.name.setValidators([Validators.required]);
      this.form.controls.phone.setValidators([Validators.required, Validators.pattern(/^05\d{8}$/)]);
    } else {
      this.form.controls.name.clearValidators();
      this.form.controls.phone.clearValidators();
    }
    this.form.controls.name.updateValueAndValidity();
    this.form.controls.phone.updateValueAndValidity();

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
        this.errorMsg.set(err.error?.message ?? 'משהו השתבש. אנא נסו שוב.');
      },
    });
  }
}
