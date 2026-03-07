export type RequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Completed' | 'Cancelled';

export interface ServiceRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  providerId: string;
  providerName: string;
  petId: string | null;
  petName: string | null;
  status: RequestStatus;
  createdAt: string;
  providerPhone?: string;
  hasReview: boolean;
  serviceId: number | null;
  serviceName: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  totalPrice: number | null;
  notes: string | null;
  cancellationReason: string | null;
  paymentStatus: string | null;
  shareMedicalRecords: boolean;
}

export interface CreateRequestPayload {
  providerId: string;
  petId: string | null;
  serviceId?: number | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string | null;
  shareMedicalRecords?: boolean;
}

export interface Review {
  id: string;
  requestId: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  communicationRating: number | null;
  reliabilityRating: number | null;
  photoUrl: string | null;
  reviewerName: string;
  createdAt: string;
}

export interface CreateReviewPayload {
  requestId: string;
  rating: number;
  comment: string;
  communicationRating?: number | null;
  reliabilityRating?: number | null;
}
