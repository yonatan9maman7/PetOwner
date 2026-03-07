import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          role="alert"
          class="pointer-events-auto w-full rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm
                 flex items-start gap-3 text-sm font-medium
                 transition-all duration-300 ease-out"
          [class]="toastClasses(toast)"
          [class.opacity-0]="toast.dismissing"
          [class.translate-y-[-8px]]="toast.dismissing"
          [class.animate-[slideDown_0.3s_ease-out]]="!toast.dismissing"
        >
          <span class="text-base leading-none mt-0.5">{{ icon(toast.type) }}</span>
          <span class="flex-1 leading-snug">{{ toast.message }}</span>
          <button
            (click)="toastService.dismiss(toast.id)"
            class="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-current ml-1"
            aria-label="Dismiss"
          >✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    :host { display: contents; }
  `],
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  toastClasses(toast: Toast): string {
    const map: Record<string, string> = {
      success: 'bg-emerald-50/95 text-emerald-800 border border-emerald-200',
      error:   'bg-red-50/95 text-red-800 border border-red-200',
      info:    'bg-sky-50/95 text-sky-800 border border-sky-200',
      warning: 'bg-amber-50/95 text-amber-800 border border-amber-200',
    };
    return map[toast.type] ?? map['info'];
  }

  icon(type: string): string {
    const map: Record<string, string> = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠',
    };
    return map[type] ?? 'ℹ';
  }
}
