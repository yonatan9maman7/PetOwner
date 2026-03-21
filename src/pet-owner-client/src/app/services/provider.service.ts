import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface ProviderProfile {
  status: string;
  isAvailableNow: boolean;
  userName: string;
  bio: string | null;
  hourlyRate: number | null;
  serviceIds: number[];
  services: string[];
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  profileImageUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  acceptsOffHoursRequests: boolean;
}

export interface UpdateProfilePayload {
  bio: string;
  hourlyRate: number | null;
  services: string[];
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  acceptsOffHoursRequests?: boolean;
}

/** Response from POST /api/providers/onboarding */
export interface ProviderOnboardingResponse {
  message: string;
  /** Present on success so the client can refresh JWT claims (e.g. Role → Provider). */
  newAccessToken?: string;
}

export interface EarningsSummary {
  totalEarned: number;
  platformFees: number;
  netEarnings: number;
  completedBookings: number;
  pendingPayments: number;
  pendingAmount: number;
}

export interface EarningsTransaction {
  paymentId: string;
  bookingId: string;
  ownerName: string;
  petName: string | null;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  createdAt: string;
  capturedAt: string | null;
}

export interface StripeConnectStatus {
  isConnected: boolean;
  accountId: string | null;
}

export interface ProviderContact {
  phone: string;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateAvailabilitySlotPayload {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UpdateAvailabilitySlotPayload {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UpcomingBooking {
  id: string;
  petOwnerName: string;
  petName: string | null;
  serviceName: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  totalPrice: number | null;
  status: string;
}

export interface TodayScheduleItem {
  id: string;
  petOwnerName: string;
  petName: string | null;
  timeSlot: string;
  status: string;
}

export interface ProviderDashboardStats {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completionRate: number;
  totalEarnings: number;
  monthlyEarnings: number;
  thisMonthBookings: number;
  averageRating: number;
  reviewCount: number;
  upcomingBookings: UpcomingBooking[];
  todaySchedule: TodayScheduleItem[];
}

/** null = not yet checked, 'None' = no profile on server */
export type ProviderStatus = 'Pending' | 'Approved' | 'Rejected' | 'None' | null;

@Injectable({ providedIn: 'root' })
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/providers';

  readonly providerStatus = signal<ProviderStatus>(null);

  getMe(): Observable<ProviderProfile | null> {
    return this.http.get<ProviderProfile>(`${this.baseUrl}/me`).pipe(
      tap((profile) => this.providerStatus.set(profile.status as ProviderStatus)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.providerStatus.set('None');
          return of(null);
        }
        throw err;
      })
    );
  }

  updateProfile(payload: UpdateProfilePayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/me`, payload);
  }

  generateBio(userNotes: string): Observable<{ bio: string }> {
    return this.http.post<{ bio: string }>(`${this.baseUrl}/generate-bio`, { userNotes });
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload-image`, formData);
  }

  getContact(providerId: string): Observable<ProviderContact> {
    return this.http.get<ProviderContact>(`${this.baseUrl}/${providerId}/contact`);
  }

  updateAvailability(isAvailable: boolean): Observable<{ message: string; isAvailableNow: boolean }> {
    return this.http.put<{ message: string; isAvailableNow: boolean }>(
      `${this.baseUrl}/availability`,
      { isAvailable },
    );
  }

  getSchedule(): Observable<AvailabilitySlot[]> {
    return this.http.get<AvailabilitySlot[]>(`${this.baseUrl}/me/schedule`);
  }

  createSlot(payload: CreateAvailabilitySlotPayload): Observable<AvailabilitySlot> {
    return this.http.post<AvailabilitySlot>(`${this.baseUrl}/me/schedule`, payload);
  }

  updateSlot(id: string, payload: UpdateAvailabilitySlotPayload): Observable<AvailabilitySlot> {
    return this.http.put<AvailabilitySlot>(`${this.baseUrl}/me/schedule/${id}`, payload);
  }

  deleteSlot(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/me/schedule/${id}`);
  }

  getEarnings(): Observable<EarningsSummary> {
    return this.http.get<EarningsSummary>(`${this.baseUrl}/me/earnings`);
  }

  getTransactions(): Observable<EarningsTransaction[]> {
    return this.http.get<EarningsTransaction[]>(`${this.baseUrl}/me/earnings/transactions`);
  }

  getStripeConnectStatus(): Observable<StripeConnectStatus> {
    return this.http.get<StripeConnectStatus>(`${this.baseUrl}/me/stripe-connect`);
  }

  getStats(): Observable<ProviderDashboardStats> {
    return this.http.get<ProviderDashboardStats>(`${this.baseUrl}/me/stats`);
  }

  refreshStatus(): void {
    this.getMe().subscribe();
  }
}
