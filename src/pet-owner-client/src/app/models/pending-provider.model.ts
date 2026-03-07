export interface PendingProvider {
  userId: string;
  name: string;
  phone: string;
  bio: string | null;
  hourlyRate: number;
  services: string[];
}
