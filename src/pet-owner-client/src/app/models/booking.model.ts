import { ServiceType, PricingUnit } from '../features/wizard/wizard.model';

export interface CreateBookingPayload {
  providerId: string;
  serviceType: ServiceType;
  startDate: string;
  endDate: string;
  notes?: string | null;
}

export interface BookingDto {
  id: string;
  ownerId: string;
  providerProfileId: string;
  providerName: string;
  ownerName: string;
  service: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  pricingUnit: string;
  status: string;
  paymentStatus: string;
  paymentUrl: string | null;
  createdAt: string;
  notes: string | null;
}
