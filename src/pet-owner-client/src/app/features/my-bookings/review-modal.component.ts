import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ReviewService } from '../../services/review.service';
import { ToastService } from '../../services/toast.service';

export interface ReviewModalInput {
  bookingId: string;
  providerName: string;
}

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center transition-opacity duration-200"
      [class.pointer-events-none]="!open"
      [class.opacity-0]="!open">

      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="close()"></div>

      <div class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:w-[calc(100%-2rem)] sm:max-w-md z-10
                  max-h-[90vh] overflow-y-auto transition-all duration-200 flex flex-col"
           [class.translate-y-full]="!open"
           [class.translate-y-0]="open"
           dir="auto">

        <!-- Header -->
        <div class="p-6 pb-3">
          <h3 class="text-lg font-bold text-gray-900 mb-1 text-start">
            {{ 'REVIEWS.MODAL_TITLE' | translate }}
          </h3>
          <p class="text-sm text-gray-500 text-start">
            {{ 'REVIEWS.MODAL_SUBTITLE' | translate: { name: data?.providerName } }}
          </p>
        </div>

        <!-- Star Rating -->
        <div class="px-6 pb-4">
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-start">
            {{ 'REVIEWS.RATING_LABEL' | translate }}
          </label>
          <div class="flex items-center gap-2 justify-center">
            @for (star of [1,2,3,4,5]; track star) {
              <button
                type="button"
                (click)="rating.set(star)"
                (mouseenter)="hoverRating.set(star)"
                (mouseleave)="hoverRating.set(0)"
                class="text-4xl transition-transform duration-100 hover:scale-110 focus:outline-none"
                [class]="(hoverRating() || rating()) >= star
                  ? 'text-amber-400 drop-shadow-sm'
                  : 'text-gray-200'"
                [attr.aria-label]="star + ' star'">
                &#9733;
              </button>
            }
          </div>
          @if (rating() > 0) {
            <p class="text-center text-sm text-gray-500 mt-2">
              {{ ratingLabel() | translate }}
            </p>
          }
        </div>

        <!-- Comment -->
        <div class="px-6 pb-4">
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 text-start">
            {{ 'REVIEWS.COMMENT_LABEL' | translate }}
          </label>
          <textarea
            rows="4"
            [(ngModel)]="comment"
            dir="auto"
            [placeholder]="'REVIEWS.RATING_PLACEHOLDER' | translate"
            class="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-start placeholder:text-start
                   text-gray-900 placeholder-gray-400
                   focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-none">
          </textarea>
        </div>

        <!-- Actions -->
        <div class="sticky bottom-0 bg-white border-t border-gray-100 p-4">
          <div class="flex gap-3">
            <button
              (click)="submit()"
              [disabled]="!canSubmit()"
              class="flex-1 flex items-center justify-center gap-2
                     bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white font-semibold rounded-xl py-3 px-4
                     transition-colors duration-150 text-sm">
              @if (submitting()) {
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {{ 'REVIEWS.SUBMITTING' | translate }}
              } @else {
                {{ 'REVIEWS.SUBMIT' | translate }}
              }
            </button>
            <button
              (click)="close()"
              class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 px-5
                     transition-colors duration-150 text-sm">
              {{ 'REVIEWS.CANCEL' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReviewModalComponent implements OnChanges {
  @Input() open = false;
  @Input() data: ReviewModalInput | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() reviewed = new EventEmitter<void>();

  private readonly reviewService = inject(ReviewService);
  private readonly toast = inject(ToastService);

  readonly rating = signal(0);
  readonly hoverRating = signal(0);
  readonly submitting = signal(false);
  comment = '';

  canSubmit(): boolean {
    return this.rating() >= 1 && !this.submitting();
  }

  ratingLabel(): string {
    const labels = [
      '',
      'REVIEWS.RATING_1',
      'REVIEWS.RATING_2',
      'REVIEWS.RATING_3',
      'REVIEWS.RATING_4',
      'REVIEWS.RATING_5',
    ];
    return labels[this.rating()] ?? '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reset();
    }
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit() || !this.data) return;

    this.submitting.set(true);
    this.reviewService.create({
      bookingId: this.data.bookingId,
      rating: this.rating(),
      comment: this.comment.trim(),
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.reviewed.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Failed to submit review.');
      },
    });
  }

  private reset(): void {
    this.rating.set(0);
    this.hoverRating.set(0);
    this.comment = '';
    this.submitting.set(false);
  }
}
