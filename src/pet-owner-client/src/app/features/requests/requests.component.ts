import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RequestService } from '../../services/request.service';
import { ReviewService } from '../../services/review.service';
import { ProviderService } from '../../services/provider.service';
import { PaymentService } from '../../services/payment.service';
import { MedicalRecord, MedicalRecordService } from '../../services/medical-record.service';
import { ToastService } from '../../services/toast.service';
import { ServiceRequest } from '../../models/service-request.model';

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50 pb-24">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-5 pt-6 pb-4">
        <h1 class="text-2xl font-bold text-gray-900">My Requests</h1>
        <p class="text-sm text-gray-500 mt-1">Track your service requests</p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16 gap-2 text-gray-500">
          <div class="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm">Loading requests...</span>
        </div>
      } @else if (requests().length === 0) {
        <div class="flex flex-col items-center justify-center p-8 text-center mx-4 mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div class="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100" aria-hidden="true">
            <svg class="h-16 w-16 text-gray-300" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="18" y="26" width="52" height="44" rx="6" stroke="currentColor" stroke-width="1.5"/>
              <path d="M18 38h52" stroke="currentColor" stroke-width="1.5"/>
              <path d="M30 18v12M44 18v12M58 18v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <rect x="34" y="48" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.2"/>
              <rect x="46" y="48" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.12"/>
              <path d="M38 62h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity="0.35"/>
            </svg>
          </div>
          <h3 class="text-lg font-semibold tracking-tight text-gray-900">No Upcoming Bookings</h3>
          <p class="mt-2 max-w-sm text-sm text-gray-500 leading-relaxed">
            @if (isProvider()) {
              When pet owners send requests, they'll show up here so you can accept and schedule.
            } @else {
              Browse trusted providers on the map and book a walk, sitting, or visit when you're ready.
            }
          </p>
          @if (isProvider()) {
            <a
              routerLink="/provider-dashboard"
              class="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              Go to Dashboard
            </a>
          } @else {
            <a
              routerLink="/"
              class="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
            >
              Find a Provider
            </a>
          }
        </div>
      } @else {
        <!-- Active Requests -->
        @if (activeRequests().length > 0) {
          <div class="px-4 pt-5 pb-2">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active</h2>
          </div>
          @for (req of activeRequests(); track req.id) {
            <div class="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div class="p-4">
                <div class="flex items-start justify-between mb-2">
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900 text-sm truncate">
                      {{ isProvider() ? req.ownerName : req.providerName }}
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      🐾 {{ req.petName ?? 'No pet' }} · {{ req.createdAt | date:'mediumDate' }}
                    </p>
                  </div>
                  <span class="shrink-0 ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClass(req.status)">
                    {{ req.status }}
                  </span>
                </div>

                <!-- Scheduling info -->
                @if (req.scheduledStart) {
                  <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 mb-2 text-xs text-gray-600">
                    <span>📅 {{ req.scheduledStart | date:'EEE, MMM d' }}</span>
                    <span>🕐 {{ req.scheduledStart | date:'HH:mm' }} – {{ req.scheduledEnd | date:'HH:mm' }}</span>
                    @if (req.totalPrice) {
                      <span class="ml-auto font-semibold text-indigo-700">₪{{ req.totalPrice }}</span>
                    }
                  </div>
                }

                @if (req.notes) {
                  <p class="text-xs text-gray-500 italic mb-2 px-0.5">"{{ req.notes }}"</p>
                }

                <!-- Payment status / Pay Now -->
                @if (req.totalPrice && !isProvider()) {
                  @if (req.paymentStatus === 'Captured') {
                    <div class="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-2 px-0.5">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      Payment captured
                    </div>
                  } @else if (req.paymentStatus === 'Authorized') {
                    <div class="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-2 px-0.5">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      Payment authorized
                    </div>
                  } @else if (!req.paymentStatus && (req.status === 'Pending' || req.status === 'Accepted')) {
                    <button
                      (click)="openPaymentModal(req)"
                      class="mb-2 w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700
                             text-white text-sm font-semibold rounded-xl py-2.5 transition-colors">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pay Now · ₪{{ req.totalPrice }}
                    </button>
                  }
                }

                <!-- Provider actions on Pending requests -->
                @if (req.status === 'Pending' && isProvider()) {
                  <div class="flex gap-2 mt-3">
                    <button
                      (click)="acceptRequest(req.id)"
                      [disabled]="actionLoading() === req.id"
                      class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold
                             rounded-xl py-2.5 transition-colors disabled:opacity-50">
                      {{ actionLoading() === req.id ? 'Updating...' : '✓ Accept' }}
                    </button>
                    <button
                      (click)="rejectRequest(req.id)"
                      [disabled]="actionLoading() === req.id"
                      class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold
                             rounded-xl py-2.5 transition-colors disabled:opacity-50">
                      ✕ Reject
                    </button>
                  </div>
                }

                <!-- Accepted: show complete + WhatsApp + cancel -->
                @if (req.status === 'Accepted') {
                  <div class="flex gap-2 mt-3">
                    <button
                      (click)="completeRequest(req.id)"
                      [disabled]="actionLoading() === req.id"
                      class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                             rounded-xl py-2.5 transition-colors disabled:opacity-50">
                      {{ actionLoading() === req.id ? 'Updating...' : '✓ Mark Completed' }}
                    </button>
                    @if (req.providerPhone) {
                      <button
                        (click)="openWhatsApp(req)"
                        class="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600
                               text-white text-sm font-semibold rounded-xl py-2.5 px-4 transition-colors">
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.477-.67-6.309-1.826l-.452-.277-2.644.886.886-2.644-.277-.452A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        WhatsApp
                      </button>
                    }
                  </div>
                }

                <!-- Provider: View shared medical records -->
                @if (isProvider() && req.shareMedicalRecords && req.status === 'Accepted' && req.petId) {
                  <div class="mt-3">
                    @if (medicalRecordsBookingId() === req.id) {
                      <div class="bg-blue-50 rounded-xl p-3 mb-2">
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-semibold text-blue-800 uppercase tracking-wider">Health Records</span>
                          <button (click)="closeMedicalRecords()" class="text-xs text-blue-500 hover:text-blue-700 font-medium">Hide</button>
                        </div>
                        @if (medicalRecordsLoading()) {
                          <div class="flex items-center gap-2 py-3 justify-center text-blue-400">
                            <div class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            <span class="text-xs">Loading...</span>
                          </div>
                        } @else if (sharedMedicalRecords().length === 0) {
                          <p class="text-xs text-gray-500 text-center py-2">No medical records on file.</p>
                        } @else {
                          <div class="space-y-2">
                            @for (rec of sharedMedicalRecords(); track rec.id) {
                              <div class="bg-white rounded-lg p-2.5 border border-blue-100">
                                <div class="flex items-center gap-2 mb-0.5">
                                  <span class="text-sm">{{ recordTypeIcon(rec.type) }}</span>
                                  <span class="text-xs font-semibold text-gray-900">{{ rec.title }}</span>
                                  <span class="text-[10px] font-medium rounded-full px-1.5 py-0.5"
                                        [class]="recordTypeBadgeClass(rec.type)">
                                    {{ rec.type === 'VetVisit' ? 'Vet Visit' : rec.type }}
                                  </span>
                                </div>
                                <p class="text-[11px] text-gray-400">{{ rec.date | date:'mediumDate' }}</p>
                                @if (rec.description) {
                                  <p class="text-xs text-gray-600 mt-1">{{ rec.description }}</p>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    } @else {
                      <button
                        (click)="viewMedicalRecords(req.id)"
                        class="w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100
                               text-blue-700 text-xs font-medium rounded-xl py-2 transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Health Records
                      </button>
                    }
                  </div>
                }

                <!-- Owner: Medical records shared badge -->
                @if (!isProvider() && req.shareMedicalRecords && (req.status === 'Pending' || req.status === 'Accepted')) {
                  <div class="flex items-center gap-1.5 text-xs text-blue-500 font-medium mt-2 px-0.5">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Health records shared
                  </div>
                }

                <!-- Cancel button for Pending (owner) or Accepted -->
                @if ((req.status === 'Pending' && !isProvider()) || req.status === 'Accepted') {
                  <button
                    (click)="cancelRequest(req)"
                    [disabled]="actionLoading() === req.id"
                    class="mt-2 w-full bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600
                           text-xs font-medium rounded-xl py-2 transition-colors disabled:opacity-50">
                    Cancel Booking
                  </button>
                }
              </div>
            </div>
          }
        }

        <!-- Past Requests -->
        @if (pastRequests().length > 0) {
          <div class="px-4 pt-5 pb-2">
            <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Past</h2>
          </div>
          @for (req of pastRequests(); track req.id) {
            <div class="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div class="p-4">
                <div class="flex items-start justify-between mb-2">
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900 text-sm truncate">
                      {{ isProvider() ? req.ownerName : req.providerName }}
                    </p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      🐾 {{ req.petName ?? 'No pet' }} · {{ req.createdAt | date:'mediumDate' }}
                    </p>
                  </div>
                  <span class="shrink-0 ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClass(req.status)">
                    {{ req.status }}
                  </span>
                </div>

                @if (req.scheduledStart) {
                  <div class="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2 mb-2 text-xs text-gray-600">
                    <span>📅 {{ req.scheduledStart | date:'EEE, MMM d' }}</span>
                    <span>🕐 {{ req.scheduledStart | date:'HH:mm' }} – {{ req.scheduledEnd | date:'HH:mm' }}</span>
                    @if (req.totalPrice) {
                      <span class="ml-auto font-semibold text-indigo-700">₪{{ req.totalPrice }}</span>
                    }
                  </div>
                }

                @if (req.cancellationReason) {
                  <p class="text-xs text-red-500 mb-2 px-0.5">Reason: {{ req.cancellationReason }}</p>
                }

                @if (req.status === 'Completed' && !req.hasReview && !isProvider()) {
                  <button
                    (click)="openReviewModal(req)"
                    class="mt-2 w-full bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold
                           rounded-xl py-2.5 transition-colors">
                    ⭐ Leave a Review
                  </button>
                }

                @if (req.status === 'Completed' && req.hasReview) {
                  <p class="mt-2 text-xs text-emerald-600 font-medium">✓ Reviewed</p>
                }
              </div>
            </div>
          }
        }
      }
    </div>

    <!-- Review Modal -->
    <div
      class="fixed inset-0 z-[2000] flex items-center justify-center transition-opacity duration-200"
      [class.pointer-events-none]="!isReviewModalOpen()"
      [class.opacity-0]="!isReviewModalOpen()">

      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="closeReviewModal()"></div>

      <div class="relative bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-sm p-6 z-10
                  transition-all duration-200"
           [class.scale-95]="!isReviewModalOpen()"
           [class.scale-100]="isReviewModalOpen()">

        <h3 class="text-lg font-bold text-gray-900 mb-1">Leave a Review</h3>
        @if (reviewingRequest(); as req) {
          <p class="text-sm text-gray-500 mb-4">
            Rate your experience with
            <span class="font-medium text-violet-600">{{ req.providerName }}</span>
          </p>
        }

        <!-- Overall Rating -->
        <div class="mb-4">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">Overall</p>
          <div class="flex items-center justify-center gap-2">
            @for (star of [1, 2, 3, 4, 5]; track star) {
              <button
                (click)="reviewRating.set(star)"
                class="text-3xl transition-transform duration-150 hover:scale-110 focus:outline-none"
                [class]="star <= reviewRating() ? 'grayscale-0' : 'grayscale opacity-30'">
                ⭐
              </button>
            }
          </div>
        </div>

        <!-- Sub-ratings -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <p class="text-xs font-medium text-gray-500 mb-1.5">Communication</p>
            <div class="flex items-center justify-center gap-1">
              @for (star of [1, 2, 3, 4, 5]; track star) {
                <button
                  (click)="communicationRating.set(communicationRating() === star ? 0 : star)"
                  class="text-lg transition-transform duration-150 hover:scale-110 focus:outline-none"
                  [class]="star <= communicationRating() ? 'grayscale-0' : 'grayscale opacity-30'">
                  ⭐
                </button>
              }
            </div>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <p class="text-xs font-medium text-gray-500 mb-1.5">Reliability</p>
            <div class="flex items-center justify-center gap-1">
              @for (star of [1, 2, 3, 4, 5]; track star) {
                <button
                  (click)="reliabilityRating.set(reliabilityRating() === star ? 0 : star)"
                  class="text-lg transition-transform duration-150 hover:scale-110 focus:outline-none"
                  [class]="star <= reliabilityRating() ? 'grayscale-0' : 'grayscale opacity-30'">
                  ⭐
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Comment -->
        <textarea
          [(ngModel)]="reviewCommentValue"
          placeholder="Tell others about your experience..."
          rows="3"
          class="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800
                 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                 focus:border-indigo-400 resize-none mb-4"></textarea>

        <div class="flex gap-3">
          <button
            (click)="submitReview()"
            [disabled]="reviewRating() === 0 || submittingReview()"
            class="flex-1 flex items-center justify-center gap-2
                   bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-semibold rounded-xl py-3 px-4
                   transition-colors duration-150 text-sm">
            @if (submittingReview()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Submitting...
            } @else {
              Submit Review
            }
          </button>
          <button
            (click)="closeReviewModal()"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 px-5
                   transition-colors duration-150 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div
      class="fixed inset-0 z-[2000] flex items-center justify-center transition-opacity duration-200"
      [class.pointer-events-none]="!isPaymentModalOpen()"
      [class.opacity-0]="!isPaymentModalOpen()">

      <div class="absolute inset-0 bg-black/40 backdrop-blur-[2px]" (click)="closePaymentModal()"></div>

      <div class="relative bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-sm p-6 z-10
                  transition-all duration-200"
           [class.scale-95]="!isPaymentModalOpen()"
           [class.scale-100]="isPaymentModalOpen()">

        <h3 class="text-lg font-bold text-gray-900 mb-1">Secure Payment</h3>
        @if (payingRequest(); as req) {
          <p class="text-sm text-gray-500 mb-4">
            Service with
            <span class="font-medium text-violet-600">{{ req.providerName }}</span>
          </p>

          <div class="bg-indigo-50 rounded-xl p-3.5 mb-5 flex items-center justify-between">
            <span class="text-sm text-gray-600">Total amount</span>
            <span class="text-xl font-bold text-indigo-700">₪{{ req.totalPrice }}</span>
          </div>
        }

        <!-- Stripe Card Element container -->
        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Card Details</label>
        <div id="stripe-card-element"
             class="border-2 border-gray-200 rounded-xl px-4 py-3.5 mb-2
                    focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100
                    transition bg-white min-h-[44px]">
        </div>

        @if (paymentError()) {
          <p class="text-xs text-red-500 mb-3">{{ paymentError() }}</p>
        }

        <div class="flex gap-3 mt-4">
          <button
            (click)="confirmPayment()"
            [disabled]="paymentProcessing()"
            class="flex-1 flex items-center justify-center gap-2
                   bg-violet-600 hover:bg-violet-700 active:bg-violet-800
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-semibold rounded-xl py-3 px-4
                   transition-colors duration-150 text-sm">
            @if (paymentProcessing()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing...
            } @else {
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Pay Securely
            }
          </button>
          <button
            (click)="closePaymentModal()"
            [disabled]="paymentProcessing()"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl py-3 px-5
                   transition-colors duration-150 text-sm disabled:opacity-50">
            Cancel
          </button>
        </div>

        <p class="text-[10px] text-gray-400 text-center mt-3">
          Secured by Stripe. Your card details never touch our servers.
        </p>
      </div>
    </div>
  `,
})
export class RequestsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly requestService = inject(RequestService);
  private readonly reviewService = inject(ReviewService);
  private readonly providerService = inject(ProviderService);
  private readonly paymentService = inject(PaymentService);
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly toast = inject(ToastService);

  medicalRecordsBookingId = signal<string | null>(null);
  sharedMedicalRecords = signal<MedicalRecord[]>([]);
  medicalRecordsLoading = signal(false);

  requests = signal<ServiceRequest[]>([]);
  loading = signal(false);
  actionLoading = signal<string | null>(null);

  isPaymentModalOpen = signal(false);
  payingRequest = signal<ServiceRequest | null>(null);
  paymentProcessing = signal(false);
  paymentError = signal<string | null>(null);
  private cardElement: any = null;
  private stripeElements: any = null;

  isReviewModalOpen = signal(false);
  reviewingRequest = signal<ServiceRequest | null>(null);
  reviewRating = signal(0);
  communicationRating = signal(0);
  reliabilityRating = signal(0);
  reviewCommentValue = '';
  submittingReview = signal(false);

  readonly isProvider = computed(() => {
    const status = this.providerService.providerStatus();
    return status === 'Approved' || status === 'Pending';
  });

  readonly activeRequests = computed(() =>
    this.requests().filter(r => r.status === 'Pending' || r.status === 'Accepted')
  );

  readonly pastRequests = computed(() =>
    this.requests().filter(r => r.status === 'Completed' || r.status === 'Rejected' || r.status === 'Cancelled')
  );

  ngOnInit(): void {
    this.loadRequests();
    if (this.auth.userRole() === 'Provider') {
      this.providerService.refreshStatus();
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Pending':   return 'bg-amber-50 text-amber-700';
      case 'Accepted':  return 'bg-emerald-50 text-emerald-700';
      case 'Rejected':  return 'bg-red-50 text-red-600';
      case 'Completed': return 'bg-indigo-50 text-indigo-700';
      case 'Cancelled': return 'bg-gray-100 text-gray-500';
      default:          return 'bg-gray-50 text-gray-600';
    }
  }

  acceptRequest(id: string): void {
    this.actionLoading.set(id);
    this.requestService.accept(id).subscribe({
      next: () => {
        this.toast.success('Request accepted!');
        this.loadRequests();
      },
      error: () => this.actionLoading.set(null),
    });
  }

  rejectRequest(id: string): void {
    this.actionLoading.set(id);
    this.requestService.reject(id).subscribe({
      next: () => {
        this.toast.show('Request rejected.', 'info');
        this.loadRequests();
      },
      error: () => this.actionLoading.set(null),
    });
  }

  completeRequest(id: string): void {
    this.actionLoading.set(id);
    this.requestService.complete(id).subscribe({
      next: () => {
        this.toast.success('Request marked as completed!');
        this.loadRequests();
      },
      error: () => this.actionLoading.set(null),
    });
  }

  cancelRequest(req: ServiceRequest): void {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;

    this.actionLoading.set(req.id);
    this.requestService.cancel(req.id, reason.trim() || undefined).subscribe({
      next: () => {
        this.toast.show('Booking cancelled.', 'info');
        this.loadRequests();
      },
      error: () => this.actionLoading.set(null),
    });
  }

  openWhatsApp(req: ServiceRequest): void {
    if (!req.providerPhone) return;
    const phone = req.providerPhone.replace(/\D/g, '');
    const text = encodeURIComponent(`Hi ${req.providerName}! Following up on our PetOwner booking for ${req.petName ?? 'my pet'}.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener');
  }

  async openPaymentModal(req: ServiceRequest): Promise<void> {
    this.payingRequest.set(req);
    this.paymentError.set(null);
    this.isPaymentModalOpen.set(true);

    const stripe = await this.paymentService.getStripe();
    if (!stripe) {
      this.paymentError.set('Failed to load payment system. Please try again.');
      return;
    }

    setTimeout(() => {
      this.stripeElements = stripe.elements();
      this.cardElement = this.stripeElements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1f2937',
            '::placeholder': { color: '#9ca3af' },
          },
          invalid: { color: '#dc2626' },
        },
      });
      this.cardElement.mount('#stripe-card-element');
    }, 100);
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen.set(false);
    this.payingRequest.set(null);
    this.paymentError.set(null);
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
    this.stripeElements = null;
  }

  confirmPayment(): void {
    const req = this.payingRequest();
    if (!req || !this.cardElement) return;

    this.paymentProcessing.set(true);
    this.paymentError.set(null);

    this.paymentService.checkout(req.id).subscribe({
      next: async (checkout) => {
        const result = await this.paymentService.confirmCardPayment(checkout.clientSecret, this.cardElement);

        this.paymentProcessing.set(false);

        if (result.success) {
          this.closePaymentModal();
          this.toast.success('Payment authorized successfully!');
          this.loadRequests();
        } else {
          this.paymentError.set(result.error ?? 'Payment failed. Please try again.');
        }
      },
      error: () => {
        this.paymentProcessing.set(false);
        this.paymentError.set('Could not initiate checkout. Please try again.');
      },
    });
  }

  openReviewModal(req: ServiceRequest): void {
    this.reviewingRequest.set(req);
    this.reviewRating.set(0);
    this.communicationRating.set(0);
    this.reliabilityRating.set(0);
    this.reviewCommentValue = '';
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
    this.reviewingRequest.set(null);
  }

  submitReview(): void {
    const req = this.reviewingRequest();
    if (!req || this.reviewRating() === 0) return;

    this.submittingReview.set(true);

    this.reviewService.create({
      requestId: req.id,
      rating: this.reviewRating(),
      comment: this.reviewCommentValue.trim(),
      communicationRating: this.communicationRating() || null,
      reliabilityRating: this.reliabilityRating() || null,
    }).subscribe({
      next: () => {
        this.submittingReview.set(false);
        this.closeReviewModal();
        this.toast.success('Review submitted! Thanks for your feedback.');
        this.loadRequests();
      },
      error: () => {
        this.submittingReview.set(false);
      },
    });
  }

  viewMedicalRecords(bookingId: string): void {
    this.medicalRecordsBookingId.set(bookingId);
    this.sharedMedicalRecords.set([]);
    this.medicalRecordsLoading.set(true);
    this.medicalRecordService.getSharedForBooking(bookingId).subscribe({
      next: (res) => {
        this.sharedMedicalRecords.set(res.records);
        this.medicalRecordsLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load health records.');
        this.medicalRecordsLoading.set(false);
      },
    });
  }

  closeMedicalRecords(): void {
    this.medicalRecordsBookingId.set(null);
    this.sharedMedicalRecords.set([]);
  }

  recordTypeIcon(type: string): string {
    switch (type) {
      case 'Vaccination': return '💉';
      case 'Condition':   return '🩺';
      case 'Medication':  return '💊';
      case 'VetVisit':    return '🏥';
      default:            return '📋';
    }
  }

  recordTypeBadgeClass(type: string): string {
    switch (type) {
      case 'Vaccination': return 'bg-green-100 text-green-700';
      case 'Condition':   return 'bg-orange-100 text-orange-700';
      case 'Medication':  return 'bg-blue-100 text-blue-700';
      case 'VetVisit':    return 'bg-purple-100 text-purple-700';
      default:            return 'bg-slate-100 text-slate-700';
    }
  }

  private loadRequests(): void {
    this.loading.set(true);
    this.requestService.getAll().subscribe({
      next: (reqs) => {
        this.requests.set(reqs);
        this.loading.set(false);
        this.actionLoading.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.actionLoading.set(null);
      },
    });
  }
}
