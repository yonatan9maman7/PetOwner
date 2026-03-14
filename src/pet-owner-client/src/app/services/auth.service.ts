import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { tap } from 'rxjs';

export interface AuthResponse {
  token: string;
}

const ROLE_CLAIM_URI = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

export interface JwtPayload {
  sub: string;
  name: string;
  exp: number;
  role?: string | string[];
  [key: string]: unknown;
}

export interface CurrentUser {
  userId: string;
  role: string;
}

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(this.storedToken());

  readonly token = this.tokenSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal() && !this.isExpired());

  readonly currentUser$ = computed<CurrentUser | null>(() => {
    const payload = this.decoded();
    if (!payload || this.isExpired()) return null;
    const role = (payload.role ?? payload[ROLE_CLAIM_URI] ?? '') as string;
    return { userId: payload.sub, role };
  });

  readonly userId = computed(() => this.currentUser$()?.userId ?? null);
  readonly userRole = computed(() => this.currentUser$()?.role ?? null);
  readonly userName = computed(() => this.decoded()?.name ?? null);

  readonly roles = computed<string[]>(() => {
    const payload = this.decoded();
    if (!payload || this.isExpired()) return [];
    const raw = payload.role ?? payload[ROLE_CLAIM_URI];
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string' && raw.length > 0) return [raw];
    return [];
  });

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  private readonly decoded = computed<JwtPayload | null>(() => {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  });

  login(phone: string, password: string) {
    return this.http.post<AuthResponse>('/api/auth/login', { phone, password }).pipe(
      tap((res) => this.setToken(res.token)),
    );
  }

  register(phone: string, password: string, name: string) {
    return this.http.post<AuthResponse>('/api/auth/register', { phone, password, name }).pipe(
      tap((res) => this.setToken(res.token)),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
    this.router.navigateByUrl('/login');
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.tokenSignal.set(token);
  }

  private storedToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private isExpired(): boolean {
    const payload = this.decoded();
    if (!payload) return true;
    return Date.now() >= payload.exp * 1000;
  }
}
