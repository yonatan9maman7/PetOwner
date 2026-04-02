import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { TermsModalComponent } from '../../shared/terms-modal/terms-modal.component';

export type AuthView = 'login' | 'register' | 'forgot';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, TranslatePipe, TermsModalComponent],
  templateUrl: './login.component.html',
  styles: [
    `
      :host {
        display: block;
      }
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly view = signal<AuthView>('login');
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly termsModalOpen = signal(false);
  readonly hideLoginPassword = signal(true);
  readonly forgotSent = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: [''],
    agreeTerms: [false as boolean],
    role: this.fb.nonNullable.control<'Owner' | 'Provider'>('Owner'),
  });

  constructor() {
    this.syncValidators();
  }

  setView(next: AuthView): void {
    this.view.set(next);
    this.errorMsg.set('');
    if (next !== 'forgot') {
      this.forgotSent.set(false);
    }
    this.syncValidators();
  }

  private syncValidators(): void {
    const v = this.view();
    const { name, phone, password, confirmPassword, agreeTerms, email } = this.form.controls;

    name.clearValidators();
    phone.clearValidators();
    confirmPassword.clearValidators();
    agreeTerms.clearValidators();
    email.setValidators([Validators.required, Validators.email]);

    if (v === 'login') {
      password.setValidators([Validators.required, Validators.minLength(6)]);
    } else if (v === 'register') {
      password.setValidators([Validators.required, Validators.minLength(6)]);
      name.setValidators([Validators.required]);
      phone.setValidators([Validators.required, Validators.pattern(/^05\d{8}$/)]);
      confirmPassword.setValidators([Validators.required]);
      agreeTerms.setValidators([Validators.requiredTrue]);
    } else {
      password.clearValidators();
    }

    name.updateValueAndValidity({ emitEvent: false });
    phone.updateValueAndValidity({ emitEvent: false });
    password.updateValueAndValidity({ emitEvent: false });
    confirmPassword.updateValueAndValidity({ emitEvent: false });
    agreeTerms.updateValueAndValidity({ emitEvent: false });
    email.updateValueAndValidity({ emitEvent: false });
  }

  onLoginSubmit(): void {
    this.errorMsg.set('');
    this.syncValidators();
    const { email, password } = this.form.getRawValue();
    if (this.form.controls.email.invalid || this.form.controls.password.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? this.translate.instant('AUTH.ERROR_GENERIC'));
      },
    });
  }

  onRegisterSubmit(): void {
    this.errorMsg.set('');
    this.syncValidators();
    this.form.controls.confirmPassword.setErrors(null);

    const { name, email, phone, password, confirmPassword, role } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.form.controls.confirmPassword.setErrors({ mismatch: true });
      this.form.controls.confirmPassword.markAsTouched();
      this.errorMsg.set(this.translate.instant('AUTH.PASSWORDS_MISMATCH'));
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth
      .register({
        email,
        phone,
        password,
        name,
        role,
        languagePreference: this.languageService.currentLang(),
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(err.error?.message ?? this.translate.instant('AUTH.ERROR_GENERIC'));
        },
      });
  }

  onForgotSubmit(): void {
    this.errorMsg.set('');
    this.forgotSent.set(false);
    this.syncValidators();

    const emailCtrl = this.form.controls.email;
    if (emailCtrl.invalid) {
      emailCtrl.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.forgotPassword(emailCtrl.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.forgotSent.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? this.translate.instant('AUTH.ERROR_GENERIC'));
      },
    });
  }
}
