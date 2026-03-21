import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ProviderService,
  AvailabilitySlot,
} from '../../services/provider.service';
import { ToastService } from '../../services/toast.service';

const DAY_KEYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

@Component({
  selector: 'app-schedule-manager',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="schedule-section">
      <h2 class="text-lg font-semibold text-slate-900 mb-1 text-start" dir="auto">
        {{ 'SCHEDULE.TITLE' | translate }}
      </h2>
      <p class="text-sm text-slate-500 mb-4 text-start" dir="auto">
        {{ 'SCHEDULE.SUBTITLE' | translate }}
      </p>

      @if (loading()) {
        <div class="flex items-center justify-center py-8 text-slate-400">
          <svg class="w-6 h-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span class="ms-2 text-sm" dir="auto">{{ 'SCHEDULE.LOADING' | translate }}</span>
        </div>
      } @else {
        <div class="space-y-3">
          @for (day of days; track day.index) {
            <div class="day-card">
              <div class="day-header">
                <span class="day-name text-start" dir="auto">{{ ('SCHEDULE.DAYS.' + day.key) | translate }}</span>
                <button
                  type="button"
                  class="add-btn shrink-0"
                  (click)="startAdding(day.index)"
                  [disabled]="saving()"
                >
                  <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span dir="auto">{{ 'SCHEDULE.ADD' | translate }}</span>
                </button>
              </div>

              @for (slot of slotsForDay(day.index); track slot.id) {
                <div class="slot-row">
                  @if (editingSlotId() === slot.id) {
                    <div class="slot-form">
                      <input type="time" [(ngModel)]="editStart" dir="auto" class="time-input text-start" />
                      <span class="text-slate-400 shrink-0" dir="auto">{{ 'SCHEDULE.TIME_TO' | translate }}</span>
                      <input type="time" [(ngModel)]="editEnd" dir="auto" class="time-input text-start" />
                      <button type="button" class="icon-btn save" (click)="saveEdit(slot)" [disabled]="saving()">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                      <button type="button" class="icon-btn cancel" (click)="cancelForm()">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  } @else {
                    <div class="slot-display">
                      <span class="slot-time">{{ formatTime(slot.startTime) }} – {{ formatTime(slot.endTime) }}</span>
                      <div class="slot-actions">
                        <button type="button" class="icon-btn edit" (click)="startEditing(slot)" [disabled]="saving()">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button type="button" class="icon-btn delete" (click)="confirmDelete(slot)" [disabled]="saving()">
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (addingDay() === day.index) {
                <div class="slot-row">
                  <div class="slot-form">
                    <input type="time" [(ngModel)]="editStart" dir="auto" class="time-input text-start" />
                    <span class="text-slate-400 shrink-0" dir="auto">{{ 'SCHEDULE.TIME_TO' | translate }}</span>
                    <input type="time" [(ngModel)]="editEnd" dir="auto" class="time-input text-start" />
                    <button type="button" class="icon-btn save" (click)="saveNew(day.index)" [disabled]="saving()">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn cancel" (click)="cancelForm()">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              }

              @if (slotsForDay(day.index).length === 0 && addingDay() !== day.index) {
                <p class="no-slots text-start" dir="auto">{{ 'SCHEDULE.NO_AVAILABILITY' | translate }}</p>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .schedule-section {
      margin-top: 0.5rem;
    }

    .day-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }

    .day-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.6rem 0.85rem;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
    }

    .day-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6366f1;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      transition: background 0.15s;

      &:hover:not(:disabled) {
        background: #eef2ff;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .slot-row {
      padding: 0.5rem 0.85rem;
      border-top: 1px solid #f1f5f9;
    }

    .slot-display {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .slot-time {
      font-size: 0.875rem;
      color: #1e293b;
      font-variant-numeric: tabular-nums;
    }

    .slot-actions {
      display: flex;
      gap: 0.25rem;
    }

    .slot-form {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .time-input {
      width: 110px;
      padding: 0.4rem 0.6rem;
      font-size: 0.85rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      text-align: start;
      unicode-bidi: plaintext;
      transition: border-color 0.2s;

      &:focus {
        border-color: #6366f1;
      }
    }

    .icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .icon-btn.edit {
      color: #64748b;
      background: none;
      &:hover:not(:disabled) { background: #f1f5f9; color: #6366f1; }
    }

    .icon-btn.delete {
      color: #64748b;
      background: none;
      &:hover:not(:disabled) { background: #fef2f2; color: #ef4444; }
    }

    .icon-btn.save {
      color: #fff;
      background: #6366f1;
      &:hover:not(:disabled) { background: #4f46e5; }
    }

    .icon-btn.cancel {
      color: #64748b;
      background: #f1f5f9;
      &:hover:not(:disabled) { background: #e2e8f0; }
    }

    .no-slots {
      padding: 0.5rem 0.85rem;
      font-size: 0.8rem;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
    }
  `],
})
export class ScheduleManagerComponent implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly days = DAY_KEYS.map((key, index) => ({ key, index }));

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly slots = signal<AvailabilitySlot[]>([]);
  readonly editingSlotId = signal<string | null>(null);
  readonly addingDay = signal<number | null>(null);

  editStart = '';
  editEnd = '';

  ngOnInit(): void {
    this.loadSchedule();
  }

  slotsForDay(day: number): AvailabilitySlot[] {
    return this.slots().filter((s) => s.dayOfWeek === day);
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  startAdding(day: number): void {
    this.editingSlotId.set(null);
    this.addingDay.set(day);
    this.editStart = '09:00';
    this.editEnd = '17:00';
  }

  startEditing(slot: AvailabilitySlot): void {
    this.addingDay.set(null);
    this.editingSlotId.set(slot.id);
    this.editStart = this.formatTime(slot.startTime);
    this.editEnd = this.formatTime(slot.endTime);
  }

  cancelForm(): void {
    this.editingSlotId.set(null);
    this.addingDay.set(null);
  }

  saveNew(day: number): void {
    if (this.saving() || !this.editStart || !this.editEnd) return;

    this.saving.set(true);
    this.providerService.createSlot({
      dayOfWeek: day,
      startTime: this.editStart + ':00',
      endTime: this.editEnd + ':00',
    }).subscribe({
      next: (created) => {
        this.slots.update((list) =>
          [...list, created].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
        );
        this.toast.success(this.translate.instant('SCHEDULE.TOAST_SLOT_ADDED'));
        this.cancelForm();
        this.saving.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('SCHEDULE.ERROR_ADD_SLOT'));
        this.saving.set(false);
      },
    });
  }

  saveEdit(slot: AvailabilitySlot): void {
    if (this.saving() || !this.editStart || !this.editEnd) return;

    this.saving.set(true);
    this.providerService.updateSlot(slot.id, {
      dayOfWeek: slot.dayOfWeek,
      startTime: this.editStart + ':00',
      endTime: this.editEnd + ':00',
    }).subscribe({
      next: (updated) => {
        this.slots.update((list) =>
          list.map((s) => (s.id === updated.id ? updated : s))
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
        );
        this.toast.success(this.translate.instant('SCHEDULE.TOAST_SLOT_UPDATED'));
        this.cancelForm();
        this.saving.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('SCHEDULE.ERROR_UPDATE_SLOT'));
        this.saving.set(false);
      },
    });
  }

  confirmDelete(slot: AvailabilitySlot): void {
    const dayKey = DAY_KEYS[slot.dayOfWeek];
    const dayLabel = this.translate.instant(`SCHEDULE.DAYS.${dayKey}`);
    const time = `${this.formatTime(slot.startTime)} – ${this.formatTime(slot.endTime)}`;
    const msg = this.translate.instant('SCHEDULE.CONFIRM_REMOVE', { day: dayLabel, time });
    if (!confirm(msg)) return;

    this.saving.set(true);
    this.providerService.deleteSlot(slot.id).subscribe({
      next: () => {
        this.slots.update((list) => list.filter((s) => s.id !== slot.id));
        this.toast.success(this.translate.instant('SCHEDULE.TOAST_SLOT_REMOVED'));
        this.saving.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('SCHEDULE.ERROR_REMOVE_SLOT'));
        this.saving.set(false);
      },
    });
  }

  private loadSchedule(): void {
    this.loading.set(true);
    this.providerService.getSchedule().subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('SCHEDULE.ERROR_LOAD_SCHEDULE'));
        this.loading.set(false);
      },
    });
  }
}
