import { ServiceRateDto } from '../features/wizard/wizard.model';

export interface PendingProvider {
  userId: string;
  name: string;
  phone: string;
  bio: string | null;
  serviceRates: ServiceRateDto[];
  profileImageUrl: string | null;
  createdAt: string;
  address: string | null;
  services: string[];
  referenceName: string | null;
  referenceContact: string | null;
}
