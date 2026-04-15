import axios from "axios";
import { useAuthStore } from "../store/authStore";
import { API_BASE_URL } from "../config/server";
import type {
  LoginDto,
  RegisterDto,
  AuthResponse,
  MapSearchFilters,
  MapPinDto,
  ProviderPublicProfileDto,
  ContactDto,
  PetDto,
  CreatePetRequest,
  UpdatePetRequest,
  ReportLostRequest,
  LostPetDto,
  ChatConversationDto,
  ChatMessageDto,
  ProviderMeResponse,
  UpdateProfileDto,
  ProviderApplicationPayload,
  ProviderApplicationResponse,
  GenerateBioResponse,
  AvailabilitySlotDto,
  CreateAvailabilitySlotDto,
  UpdateAvailabilitySlotDto,
  ProviderStatsDto,
  EarningsSummaryDto,
  EarningsTransactionDto,
  TeletriageRequestDto,
  TeletriageResponseDto,
  TeletriageHistoryDto,
  NearbyVetDto,
  PostDto,
  CreatePostDto,
  CommentDto,
  CreateCommentDto,
  CreateCommunityGroupRequest,
  CommunityGroupDto,
  GroupPostDto,
  CreateGroupPostRequest,
  GroupPostCommentDto,
  AdminStatsDto,
  AdminUserDto,
  AdminPetDto,
  PendingProviderDto,
  NotificationDto,
  WeightLogDto,
  CreateWeightLogRequest,
  UpdateWeightLogRequest,
  VaccinationDto,
  CreateVaccinationRequest,
  VaccineStatusDto,
  MedicalRecordDto,
  HealthPassportShareDto,
  CreateBookingRequest,
  BookingDto,
  CreateContactInquiryRequest,
  ContactInquiryAdminDto,
  FavoriteProviderDto,
} from "../types/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (data: LoginDto) =>
    apiClient.post<AuthResponse>("/auth/login", data).then((r) => r.data),
  register: (data: RegisterDto) =>
    apiClient.post<AuthResponse>("/auth/register", data).then((r) => r.data),
  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),
  getMe: () =>
    apiClient
      .get<{ name: string; email: string; phone: string }>("/auth/me")
      .then((r) => r.data),
  updateProfile: (data: { name: string; phone?: string }) =>
    apiClient
      .put<AuthResponse>("/auth/profile", data)
      .then((r) => r.data),
};

export const mapApi = {
  fetchPins: (filters?: MapSearchFilters) => {
    const params: Record<string, string | number | boolean> = {};
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value != null) params[key] = value;
      }
    }
    return apiClient
      .get<MapPinDto[]>("/map/pins", { params })
      .then((r) => r.data);
  },
  getServiceTypes: () =>
    apiClient.get<string[]>("/map/service-types").then((r) => r.data),
  getProviderProfile: (providerId: string) =>
    apiClient
      .get<ProviderPublicProfileDto>(`/providers/${providerId}/profile`)
      .then((r) => r.data),
  getProviderContact: (providerId: string) =>
    apiClient
      .get<ContactDto>(`/providers/${providerId}/contact`)
      .then((r) => r.data),
};

export const petsApi = {
  getMyPets: () => apiClient.get<PetDto[]>("/pets").then((r) => r.data),
  createPet: (data: CreatePetRequest) =>
    apiClient.post<PetDto>("/pets", data).then((r) => r.data),
  updatePet: (id: string, data: UpdatePetRequest) =>
    apiClient.put<PetDto>(`/pets/${id}`, data).then((r) => r.data),
  deletePet: (id: string) => apiClient.delete(`/pets/${id}`),
  reportLost: (id: string, data: ReportLostRequest) =>
    apiClient
      .post<PetDto>(`/pets/${id}/report-lost`, data)
      .then((r) => r.data),
  markFound: (id: string) =>
    apiClient.post<PetDto>(`/pets/${id}/mark-found`).then((r) => r.data),
  getLostPets: () =>
    apiClient.get<LostPetDto[]>("/pets/lost").then((r) => r.data),
};

export const chatApi = {
  getConversations: () =>
    apiClient
      .get<ChatConversationDto[]>("/chat/conversations")
      .then((r) => r.data),
  getMessages: (otherUserId: string, page?: number) =>
    apiClient
      .get<ChatMessageDto[]>(`/chat/${otherUserId}`, {
        params: page != null ? { page } : undefined,
      })
      .then((r) => r.data),
  markAsRead: (otherUserId: string) =>
    apiClient.post(`/chat/${otherUserId}/read`),
};

export const providerApi = {
  getMe: () =>
    apiClient.get<ProviderMeResponse>("/providers/me").then((r) => r.data),
  apply: (data: ProviderApplicationPayload) =>
    apiClient.post<ProviderApplicationResponse>("/providers/apply", data).then((r) => r.data),
  updateProfile: (data: UpdateProfileDto) =>
    apiClient.put("/providers/me", data),
  generateBio: (userNotes: string) =>
    apiClient
      .post<GenerateBioResponse>("/providers/generate-bio", { userNotes })
      .then((r) => r.data),
  updateAvailability: (isAvailable: boolean) =>
    apiClient.put("/providers/availability", { isAvailable }),
  getSchedule: () =>
    apiClient
      .get<AvailabilitySlotDto[]>("/providers/me/schedule")
      .then((r) => r.data),
  createSlot: (data: CreateAvailabilitySlotDto) =>
    apiClient
      .post<AvailabilitySlotDto>("/providers/me/schedule", data)
      .then((r) => r.data),
  updateSlot: (id: string, data: UpdateAvailabilitySlotDto) =>
    apiClient
      .put<AvailabilitySlotDto>(`/providers/me/schedule/${id}`, data)
      .then((r) => r.data),
  deleteSlot: (id: string) => apiClient.delete(`/providers/me/schedule/${id}`),
  uploadImage: (file: FormData) =>
    apiClient
      .post<{ url: string; thumbnailUrl: string }>(
        "/providers/upload-image",
        file,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data),
  getStats: () =>
    apiClient.get<ProviderStatsDto>("/providers/me/stats").then((r) => r.data),
  getEarnings: () =>
    apiClient
      .get<EarningsSummaryDto>("/providers/me/earnings")
      .then((r) => r.data),
  getTransactions: () =>
    apiClient
      .get<EarningsTransactionDto[]>("/providers/me/earnings/transactions")
      .then((r) => r.data),
};

export const triageApi = {
  assess: (data: TeletriageRequestDto) =>
    apiClient
      .post<TeletriageResponseDto>("/teletriage/assess", data)
      .then((r) => r.data),
  getHistory: (petId: string) =>
    apiClient
      .get<TeletriageHistoryDto[]>(`/teletriage/history/${petId}`)
      .then((r) => r.data),
  getNearbyVets: (lat: number, lng: number, maxResults = 5) =>
    apiClient
      .get<NearbyVetDto[]>("/teletriage/nearby-vets", {
        params: { latitude: lat, longitude: lng, maxResults },
      })
      .then((r) => r.data),
};

export const postsApi = {
  getFeed: (page = 1, pageSize = 20, category?: string) =>
    apiClient
      .get<PostDto[]>("/posts/feed", {
        params: { page, pageSize, ...(category ? { category } : {}) },
      })
      .then((r) => r.data),
  create: (data: CreatePostDto) =>
    apiClient.post<PostDto>("/posts", data).then((r) => r.data),
  deletePost: (id: string) => apiClient.delete(`/posts/${id}`),
  toggleLike: (id: string) =>
    apiClient
      .post<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`)
      .then((r) => r.data),
  getComments: (postId: string) =>
    apiClient
      .get<CommentDto[]>(`/posts/${postId}/comments`)
      .then((r) => r.data),
  addComment: (postId: string, data: CreateCommentDto) =>
    apiClient
      .post<CommentDto>(`/posts/${postId}/comments`, data)
      .then((r) => r.data),
};

export const communityApi = {
  getGroups: () =>
    apiClient
      .get<CommunityGroupDto[]>("/community/groups")
      .then((r) => r.data),
  createGroup: (data: CreateCommunityGroupRequest) =>
    apiClient
      .post<CommunityGroupDto>("/community/admin/groups", data)
      .then((r) => r.data),
  getGroupPosts: (groupId: string) =>
    apiClient
      .get<GroupPostDto[]>(`/community/groups/${groupId}/posts`)
      .then((r) => r.data),
  createGroupPost: (groupId: string, data: CreateGroupPostRequest) =>
    apiClient
      .post<GroupPostDto>(`/community/groups/${groupId}/posts`, data)
      .then((r) => r.data),
  toggleGroupPostLike: (postId: string) =>
    apiClient
      .post<{ likesCount: number; isLikedByCurrentUser: boolean }>(
        `/community/posts/${postId}/like`,
      )
      .then((r) => r.data),
  getGroupPostComments: (postId: string) =>
    apiClient
      .get<GroupPostCommentDto[]>(`/community/posts/${postId}/comments`)
      .then((r) => r.data),
  addGroupPostComment: (postId: string, content: string) =>
    apiClient
      .post<GroupPostCommentDto>(`/community/posts/${postId}/comments`, {
        content,
      })
      .then((r) => r.data),
};

export const adminApi = {
  getStats: () =>
    apiClient.get<AdminStatsDto>("/admin/stats").then((r) => r.data),
  getUsers: () =>
    apiClient.get<AdminUserDto[]>("/admin/users").then((r) => r.data),
  changeRole: (userId: string, role: string) =>
    apiClient
      .patch<{ message: string; role: string }>(`/admin/users/${userId}/role`, {
        role,
      })
      .then((r) => r.data),
  toggleUserStatus: (userId: string) =>
    apiClient
      .put<{ message: string; isActive: boolean }>(
        `/admin/users/${userId}/toggle-status`,
        {},
      )
      .then((r) => r.data),
  getPets: () =>
    apiClient.get<AdminPetDto[]>("/admin/pets").then((r) => r.data),
  deletePet: (petId: string) =>
    apiClient.delete(`/admin/pets/${petId}`).then((r) => r.data),
  getPending: () =>
    apiClient
      .get<PendingProviderDto[]>("/admin/pending")
      .then((r) => r.data),
  approveProvider: (providerId: string) =>
    apiClient.put(`/admin/approve/${providerId}`).then((r) => r.data),
  suspendProvider: (providerId: string, reason?: string) =>
    apiClient
      .post(`/admin/providers/${providerId}/suspend`, { reason })
      .then((r) => r.data),
  banProvider: (providerId: string) =>
    apiClient
      .post(`/admin/providers/${providerId}/ban`)
      .then((r) => r.data),
  reactivateProvider: (providerId: string) =>
    apiClient
      .post(`/admin/providers/${providerId}/reactivate`)
      .then((r) => r.data),
  seedDemoData: () =>
    apiClient.post("/admin/seed-dummy-data").then((r) => r.data),
  seedBogusPets: () =>
    apiClient.post("/admin/seed-bogus-pets").then((r) => r.data),
  clearSos: () =>
    apiClient.post("/admin/clear-sos").then((r) => r.data),
  getInquiries: () =>
    apiClient.get<ContactInquiryAdminDto[]>("/admin/inquiries").then((r) => r.data),
  markInquiryRead: (id: string) =>
    apiClient.patch(`/admin/inquiries/${id}/read`).then((r) => r.data),
};

export const supportApi = {
  submitInquiry: (data: CreateContactInquiryRequest) =>
    apiClient.post<{ id: string }>("/support/inquiries", data).then((r) => r.data),
};

export const notificationsApi = {
  getAll: (page = 1) =>
    apiClient
      .get<NotificationDto[]>("/notifications", { params: { page, pageSize: 30 } })
      .then((r) => r.data),
  getUnreadCount: () =>
    apiClient
      .get<{ count: number }>("/notifications/unread-count")
      .then((r) => r.data),
  markRead: (id: string) =>
    apiClient.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    apiClient.post("/notifications/read-all").then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete(`/notifications/${id}`).then((r) => r.data),
};

export const filesApi = {
  uploadImage: (uri: string, folder = "sos") => {
    const name = uri.split("/").pop() ?? "photo.jpg";
    const match = /\.(\w+)$/.exec(name);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    const form = new FormData();
    form.append("file", { uri, name, type } as any);
    return apiClient
      .post<{ url: string; thumbnailUrl: string }>(
        `/files/upload/image?folder=${folder}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data);
  },
  uploadDocument: (uri: string, folder = "documents") => {
    const name = uri.split("/").pop() ?? "file";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
    };
    const type = mimeMap[ext] ?? "application/octet-stream";
    const form = new FormData();
    form.append("file", { uri, name, type } as any);
    return apiClient
      .post<{ fileName: string; url: string; thumbnailUrl: string | null; sizeBytes: number }>(
        `/files/upload/document?folder=${folder}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
      .then((r) => r.data);
  },
};

export const bookingsApi = {
  create: (data: CreateBookingRequest) =>
    apiClient.post<BookingDto>("/bookings", data).then((r) => r.data),
  getMine: () =>
    apiClient.get<BookingDto[]>("/bookings/mine").then((r) => r.data),
  getById: (id: string) =>
    apiClient.get<BookingDto>(`/bookings/${id}`).then((r) => r.data),
  confirm: (id: string) =>
    apiClient.put(`/bookings/${id}/confirm`).then((r) => r.data),
  cancel: (id: string) =>
    apiClient.put(`/bookings/${id}/cancel`).then((r) => r.data),
};

export const petHealthApi = {
  getWeightHistory: (petId: string) =>
    apiClient
      .get<WeightLogDto[]>(`/pets/${petId}/weight-history`)
      .then((r) => r.data),
  addWeightLog: (petId: string, data: CreateWeightLogRequest) =>
    apiClient
      .post<WeightLogDto>(`/pets/${petId}/weight-logs`, data)
      .then((r) => r.data),
  updateWeightLog: (petId: string, logId: string, data: UpdateWeightLogRequest) =>
    apiClient
      .put<WeightLogDto>(`/pets/${petId}/weight-logs/${logId}`, data)
      .then((r) => r.data),
  deleteWeightLog: (petId: string, logId: string) =>
    apiClient.delete(`/pets/${petId}/weight-logs/${logId}`).then((r) => r.data),
  getVaccineStatus: (petId: string) =>
    apiClient
      .get<VaccineStatusDto[]>(`/pets/${petId}/vaccine-status`)
      .then((r) => r.data),
  getVaccinations: (petId: string) =>
    apiClient
      .get<VaccinationDto[]>(`/pets/${petId}/vaccinations`)
      .then((r) => r.data),
  addVaccination: (petId: string, data: CreateVaccinationRequest) =>
    apiClient
      .post<VaccinationDto>(`/pets/${petId}/vaccinations`, data)
      .then((r) => r.data)
      .catch((error: unknown) => {
        const ax = error as { response?: { data?: unknown }; message?: string };
        console.error(
          "[petHealthApi.addVaccination] error.response?.data:",
          ax.response?.data,
          "| status:",
          (ax as { response?: { status?: number } }).response?.status,
        );
        return Promise.reject(error);
      }),
  updateVaccination: (petId: string, vacId: string, data: any) =>
    apiClient
      .put(`/pets/${petId}/vaccinations/${vacId}`, data)
      .then((r) => r.data),
  deleteVaccination: (petId: string, vacId: string) =>
    apiClient
      .delete(`/pets/${petId}/vaccinations/${vacId}`)
      .then((r) => r.data),
  getMedicalRecords: (petId: string) =>
    apiClient
      .get<MedicalRecordDto[]>(`/pets/${petId}/medical-records`)
      .then((r) => r.data),
  addMedicalRecord: (petId: string, data: { type: string; title: string; description?: string; date: string; documentUrl?: string }) =>
    apiClient
      .post<MedicalRecordDto>(`/pets/${petId}/medical-records`, data)
      .then((r) => r.data),
  deleteMedicalRecord: (petId: string, recordId: string) =>
    apiClient
      .delete(`/pets/${petId}/medical-records/${recordId}`)
      .then((r) => r.data),
  createShareLink: (petId: string) =>
    apiClient
      .post<HealthPassportShareDto>(`/pets/${petId}/health-passport/share`)
      .then((r) => r.data),
};

export const favoritesApi = {
  getAll: () =>
    apiClient
      .get<FavoriteProviderDto[]>("/favorites")
      .then((r) => r.data),
  getIds: () =>
    apiClient
      .get<string[]>("/favorites/ids")
      .then((r) => r.data),
  toggle: (providerId: string) =>
    apiClient
      .post<{ isFavorited: boolean }>(`/favorites/${providerId}/toggle`)
      .then((r) => r.data),
  check: (providerId: string) =>
    apiClient
      .get<{ isFavorited: boolean }>(`/favorites/check/${providerId}`)
      .then((r) => r.data),
};

export default apiClient;
