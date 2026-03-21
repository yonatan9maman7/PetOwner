export interface PendingProvider {
  userId: string;
  name: string;
  phone: string;
  bio: string | null;
  hourlyRate: number;
  profileImageUrl: string | null;
  createdAt: string;
  address: string | null;
  services: string[];
  referenceName: string | null;
  referenceContact: string | null;
}
