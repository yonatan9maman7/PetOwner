export interface RegisterDto {
  email: string;
  phone: string;
  password: string;
  name: string;
  role: string;
  languagePreference: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
}

export enum PetSpecies {
  Dog = 1,
  Cat = 2,
  Bird = 3,
  Rabbit = 4,
  Reptile = 5,
  Other = 6,
}

export interface PetDto {
  id: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  age: number;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  notes?: string;
  isNeutered: boolean;
  medicalNotes?: string;
  feedingSchedule?: string;
  microchipNumber?: string;
  vetName?: string;
  vetPhone?: string;
  imageUrl?: string;
  isLost: boolean;
  lastSeenLocation?: string;
  lastSeenLat?: number;
  lastSeenLng?: number;
  lostAt?: string;
  contactPhone?: string;
  communityPostId?: string;
}

export interface CreatePetRequest {
  name: string;
  species: PetSpecies;
  breed?: string;
  age: number;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  notes?: string;
  isNeutered: boolean;
  medicalNotes?: string;
  feedingSchedule?: string;
  microchipNumber?: string;
  vetName?: string;
  vetPhone?: string;
  imageUrl?: string;
}

export interface UpdatePetRequest {
  name: string;
  species: PetSpecies;
  breed?: string;
  age: number;
  weight?: number;
  allergies?: string;
  medicalConditions?: string;
  notes?: string;
  isNeutered: boolean;
  medicalNotes?: string;
  feedingSchedule?: string;
  microchipNumber?: string;
  vetName?: string;
  vetPhone?: string;
  imageUrl?: string;
}

export interface ReportLostRequest {
  lastSeenLocation: string;
  lastSeenLat: number;
  lastSeenLng: number;
  contactPhone: string;
  description?: string;
  imageUrl?: string;
}

export interface LostPetDto {
  id: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  imageUrl?: string;
  lastSeenLocation: string;
  lastSeenLat: number;
  lastSeenLng: number;
  lostAt?: string;
  contactPhone: string;
  ownerName: string;
}

export interface MapPinDto {
  providerId: string;
  name: string;
  latitude: number;
  longitude: number;
  minRate: number;
  profileImageUrl?: string;
  services: string;
  averageRating?: number;
  reviewCount: number;
  acceptsOffHoursRequests: boolean;
  providerType: ProviderType;
  whatsAppNumber?: string;
  websiteUrl?: string;
  isEmergencyService: boolean;
}

export interface MapSearchFilters {
  requestedTime?: string;
  serviceType?: string;
  minRating?: number;
  maxRate?: number;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  searchTerm?: string;
}

export interface ServiceRateDto {
  service: string;
  rate: number;
  unit: string;
  packages?: { id?: string; title: string; price: number; description?: string }[];
}

export interface PublicAvailabilitySlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ReviewDto {
  id: string;
  serviceRequestId?: string;
  bookingId?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  revieweeId: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  communicationRating?: number;
  reliabilityRating?: number;
  photoUrl?: string;
  createdAt: string;
}

export interface CreateBookingReviewRequest {
  bookingId: string;
  rating: number;
  comment: string;
}

export interface CreateServiceRequestReviewRequest {
  requestId: string;
  rating: number;
  comment: string;
  communicationRating?: number;
  reliabilityRating?: number;
}

export interface ProviderPublicProfileDto {
  providerId: string;
  name: string;
  bio?: string;
  profileImageUrl?: string;
  serviceRates: ServiceRateDto[];
  averageRating?: number;
  reviewCount: number;
  isAvailableNow: boolean;
  acceptsOffHoursRequests: boolean;
  services: string[];
  availabilitySlots: PublicAvailabilitySlotDto[];
  recentReviews: ReviewDto[];
  providerType: ProviderType;
  whatsAppNumber?: string;
  websiteUrl?: string;
  openingHours?: string;
  isEmergencyService: boolean;
}

export interface UserMiniProfileDto {
  id: string;
  name: string;
  profileImageUrl?: string;
  bio?: string;
  role: string;
  memberSince: string;
  isProvider: boolean;
  services?: string[];
  averageRating?: number;
  reviewCount?: number;
}

export interface ContactDto {
  phone: string;
}

export interface ChatConversationDto {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessageSnippet?: string;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ChatMessageDto {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  sentAt: string;
}

export interface ChatNewMessageResponse {
  conversationId: string;
  message: ChatMessageDto;
}

export enum ServiceType {
  DogWalking = 'DogWalking',
  PetSitting = 'PetSitting',
  Boarding = 'Boarding',
  DropInVisit = 'DropInVisit',
  Training = 'Training',
  Insurance = 'Insurance',
  PetStore = 'PetStore',
}

export enum PricingUnit {
  PerHour = 'PerHour',
  PerNight = 'PerNight',
  PerVisit = 'PerVisit',
  PerSession = 'PerSession',
  PerPackage = 'PerPackage',
}

export enum ProviderType {
  Individual = 'Individual',
  Business = 'Business',
}

export enum ProviderStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Suspended = 'Suspended',
  Banned = 'Banned',
  Revoked = 'Revoked',
}

export interface ProviderMeResponse {
  userId: string;
  bio: string;
  profileImageUrl: string;
  serviceRates: ServiceRateDto[];
  isAvailableNow: boolean;
  acceptsOffHoursRequests: boolean;
  status: ProviderStatus;
  type: ProviderType;
  businessName: string;
  services: string[];
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  whatsAppNumber: string;
  websiteUrl: string;
  openingHours: string;
  isEmergencyService: boolean;
  averageRating: number;
  reviewCount: number;
  stripeConnectAccountId: string;
}

export interface GenerateBioRequest {
  userNotes: string;
}

export interface GenerateBioResponse {
  bio: string;
}

export interface UpdateAvailabilityRequest {
  isAvailable: boolean;
}

export interface AvailabilitySlotDto {
  id: string;
  providerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateAvailabilitySlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UpdateAvailabilitySlotDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** Service-request row in provider stats (camelCase from API). */
export interface UpcomingBookingDto {
  id: string;
  petOwnerName: string;
  petName?: string;
  serviceName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  totalPrice?: number;
  status: string;
}

/** Today's schedule slot from provider stats API. */
export interface TodayScheduleDto {
  id: string;
  petOwnerName: string;
  petName?: string;
  timeSlot: string;
  status: string;
}

export interface ProviderStatsDto {
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
  upcomingBookings: UpcomingBookingDto[];
  todaySchedule: TodayScheduleDto[];
}

export interface EarningsSummaryDto {
  totalEarned: number;
  platformFees: number;
  netEarnings: number;
  completedBookings: number;
  pendingPayments: number;
  pendingAmount: number;
}

export interface EarningsTransactionDto {
  paymentId: string;
  bookingId: string;
  ownerName: string;
  petName?: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  createdAt: string;
  capturedAt?: string;
}

export interface NotificationDto {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface TeletriageRequestDto {
  petId: string;
  symptoms: string;
  imageBase64?: string;
}

export type TriageSeverity = "Low" | "Medium" | "High" | "Critical";

export interface TeletriageResponseDto {
  id: string;
  petId: string;
  petName: string;
  severity: TriageSeverity;
  assessment: string;
  recommendations?: string;
  isEmergency: boolean;
  createdAt: string;
}

export interface TeletriageHistoryDto {
  id: string;
  petId: string;
  petName: string;
  symptoms: string;
  severity: TriageSeverity;
  assessment: string;
  recommendations?: string;
  isEmergency: boolean;
  createdAt: string;
}

export interface NearbyVetDto {
  providerId: string;
  name: string;
  phone?: string;
  latitude: number;
  longitude: number;
  address?: string;
  distanceKm: number;
  profileImageUrl?: string;
  services: string;
  minRate: number;
  averageRating: number;
  reviewCount: number;
}

export interface PostDto {
  id: string;
  userId: string;
  userName: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
  authorRole: string;
  authorIsApprovedProvider: boolean;
  category?: string;
}

export interface CreatePostDto {
  content: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
}

export interface CommentDto {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface CreateCommentDto {
  content: string;
}

export interface CreateCommunityGroupRequest {
  name: string;
  description?: string;
  icon?: string;
  targetCountry?: string;
  targetCity?: string;
}

export interface CommunityGroupDto {
  id: string;
  name: string;
  description: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  targetCountry?: string;
  targetCity?: string;
  postCount: number;
}

export interface GroupPostDto {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  likesCount: number;
  commentsCount: number;
  isLikedByCurrentUser: boolean;
}

export interface CreateGroupPostRequest {
  content: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

export interface GroupPostCommentDto {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

export interface ServicePackagePayload {
  title: string;
  price: number;
  description?: string;
}

export interface ServiceRatePayload {
  serviceType: number;
  rate: number;
  pricingUnit: number;
  packages?: ServicePackagePayload[];
}

export interface UpdateProfileDto {
  bio: string;
  selectedServices: ServiceRatePayload[];
  latitude: number;
  longitude: number;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber?: string;
  acceptsOffHoursRequests?: boolean;
}

export interface ProviderApplicationPayload {
  type: number;
  businessName?: string;
  serviceType: number;
  city: string;
  street: string;
  buildingNumber: string;
  apartmentNumber?: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  whatsAppNumber?: string;
  websiteUrl?: string;
  openingHours?: string;
  isEmergencyService: boolean;
  description: string;
  imageUrl?: string;
  selectedServices: ServiceRatePayload[];
  referenceName?: string;
  referenceContact?: string;
}

export interface ProviderApplicationResponse {
  message: string;
  applicationId: string;
}

export interface AdminStatsDto {
  totalUsers: number;
  totalPets: number;
  totalProviders: number;
  totalBookings: number;
  activeSOSReports: number;
  pendingProviders: number;
  totalPlatformRevenue: number;
  unreadContactInquiries: number;
}

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  isActive: boolean;
  providerStatus: string | null;
  providerType?: string;
  whatsAppNumber?: string;
  websiteUrl?: string;
}

export interface AdminBookingDto {
  id: string;
  ownerName: string;
  providerName: string;
  service: string;
  status: string;
  totalPrice: number;
  startDate: string;
  createdAt: string;
}

export interface AdminPetDto {
  id: string;
  name: string;
  breed?: string;
  species: string;
  age: number;
  imageUrl?: string;
  ownerName: string;
  ownerEmail: string;
  ownerId: string;
}

export interface PendingProviderDto {
  userId: string;
  name: string;
  phone: string;
  bio?: string;
  profileImageUrl?: string;
  createdAt: string;
  address?: string;
  services: string[];
  referenceName?: string;
  referenceContact?: string;
}

export interface WeightLogDto {
  id: string;
  petId: string;
  weight: number;
  dateRecorded: string;
  createdAt: string;
}

export interface CreateWeightLogRequest {
  weight: number;
  dateRecorded: string;
}

export type UpdateWeightLogRequest = CreateWeightLogRequest;

export interface VaccinationDto {
  id: string;
  petId: string;
  /** API sends enum as JSON number; legacy clients may use string. */
  vaccineName: string | number;
  dateAdministered: string;
  nextDueDate?: string;
  notes?: string;
  documentUrl?: string;
  createdAt: string;
}

/** Numeric values must match PetOwner.Data.Models.VaccineName (System.Text.Json default enum format). */
export const VaccineNameApiValue = {
  Rabies: 1,
  Parvo: 2,
  Distemper: 3,
  Hepatitis: 4,
  Leptospirosis: 5,
  Bordetella: 6,
  Lyme: 7,
  Influenza: 8,
  Worms: 9,
  Fleas: 10,
  Ticks: 11,
  FeLV: 12,
  FIV: 13,
  Other: 99,
} as const;

export type VaccineNameOption = keyof typeof VaccineNameApiValue;

export const VACCINE_NAME_OPTIONS: VaccineNameOption[] = [
  "Rabies",
  "Parvo",
  "Distemper",
  "Hepatitis",
  "Leptospirosis",
  "Bordetella",
  "Lyme",
  "Influenza",
  "Worms",
  "Fleas",
  "Ticks",
  "FeLV",
  "FIV",
  "Other",
];

export interface CreateVaccinationRequest {
  vaccineName: number;
  dateAdministered: string;
  nextDueDate?: string;
  notes?: string;
  documentUrl?: string;
}

export interface VaccineStatusDto {
  vaccineName: string | number;
  dateAdministered?: string;
  nextDueDate?: string;
  status: "Up to Date" | "Due Soon" | "Overdue";
}

export interface MedicalRecordDto {
  id: string;
  petId: string;
  type: string;
  title: string;
  description?: string;
  date: string;
  documentUrl?: string;
  createdAt: string;
  vaccinationId?: string;
  weightLogId?: string;
}

export interface HealthPassportShareDto {
  token: string;
  url: string;
  expiresAt: string;
}

export interface CreateBookingRequest {
  providerId: string;
  serviceType: number;
  startDate: string;
  endDate: string;
  notes?: string;
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
  paymentUrl?: string;
  createdAt: string;
  notes?: string;
  providerPhone?: string;
  ownerPhone?: string;
  hasReview: boolean;
}

export interface FavoriteProviderDto {
  userId: string;
  name: string;
  profileImageUrl?: string;
  averageRating: number;
  reviewCount: number;
  isAvailableNow: boolean;
  services: string;
  minRate: number;
  favoritedAt: string;
}

export interface CreateContactInquiryRequest {
  topic: string;
  subject?: string;
  message: string;
  appVersion?: string;
  platform?: string;
}

export interface ContactInquiryAdminDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  topic: string;
  subject?: string;
  message: string;
  appVersion?: string;
  platform?: string;
  createdAt: string;
  readAt?: string;
}

/** Matches server `ActivitiesController` valid types. */
export type PetActivityType = "Walk" | "Meal" | "Exercise" | "Weight" | "Grooming";

export interface ActivityDto {
  id: string;
  petId: string;
  type: PetActivityType | string;
  value?: number;
  durationMinutes?: number;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface CreateActivityDto {
  type: PetActivityType | string;
  value?: number;
  durationMinutes?: number;
  notes?: string;
  date: string;
}

export interface UpdateActivityDto {
  type: PetActivityType | string;
  value?: number;
  durationMinutes?: number;
  notes?: string;
  date: string;
}

export interface ActivityWeightEntryDto {
  date: string;
  value: number;
}

export interface ActivitySummaryDto {
  totalWalks: number;
  totalWalkMinutes: number;
  totalWalkDistance: number;
  totalMeals: number;
  totalExercises: number;
  totalExerciseMinutes: number;
  weightHistory: ActivityWeightEntryDto[];
  currentStreak: number;
  weeklyBreakdown: Record<string, number>;
}
