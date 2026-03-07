import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  dismissing: boolean;
}

const TOAST_DURATION_MS = 4000;
const DISMISS_ANIMATION_MS = 300;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info'): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, type, dismissing: false }]);

    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: number): void {
    this.toasts.update((list) =>
      list.map((t) => (t.id === id ? { ...t, dismissing: true } : t))
    );
    setTimeout(() => {
      this.toasts.update((list) => list.filter((t) => t.id !== id));
    }, DISMISS_ANIMATION_MS);
  }
}
