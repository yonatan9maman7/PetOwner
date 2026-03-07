import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';

export interface CheckoutResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  platformFee: number;
  currency: string;
}

export interface PaymentStatus {
  id: string;
  serviceRequestId: string;
  stripePaymentIntentId: string;
  amount: number;
  platformFee: number;
  currency: string;
  status: string;
  createdAt: string;
  capturedAt: string | null;
  refundedAt: string | null;
}

const STRIPE_PUBLISHABLE_KEY = 'pk_test_placeholder';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/payments';
  private stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

  checkout(bookingId: string): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.baseUrl}/checkout/${bookingId}`, {});
  }

  getStatus(bookingId: string): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${this.baseUrl}/${bookingId}`);
  }

  async getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  async confirmCardPayment(clientSecret: string, card: StripeCardElement): Promise<{ success: boolean; error?: string }> {
    const stripe = await this.stripePromise;
    if (!stripe) return { success: false, error: 'Stripe failed to load.' };

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  }
}
