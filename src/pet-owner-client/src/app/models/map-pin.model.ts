export interface MapPin {
  providerId: string;
  name: string;
  latitude: number;
  longitude: number;
  minRate: number;
  profileImageUrl: string | null;
  services: string;
  phone: string;
  averageRating: number | null;
  reviewCount: number;
  acceptsOffHoursRequests: boolean;
}
