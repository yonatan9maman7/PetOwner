import axios from "axios";
import { useAuthStore } from "../store/authStore";

const apiClient = axios.create({
  baseURL: "http://10.0.0.51:5000/api",
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

export default apiClient;
