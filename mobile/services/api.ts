import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "../utils/network";
import { notifyAccountLocked } from "./authLock";

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

let isHandlingAccountLock = false;

const isAuthLoginRequest = (url?: string) =>
  Boolean(url && (url.includes("/auth/login") || url.includes("/auth/admin/login")));

const getLockMessage = (data?: unknown) => {
  if (!data || typeof data !== "object") {
    return "Tài khoản đã bị khóa";
  }

  const payload = data as {
    message?: string;
    lockReason?: string;
  };

  const reason = payload.lockReason?.trim();

  if (reason) {
    return `Tài khoản đã bị khóa. Lý do: ${reason}`;
  }

  if (payload.message) {
    return payload.message;
  }

  return "Tài khoản đã bị khóa";
};

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    const data = error?.response?.data;
    const isAccountLocked =
      status === 403 && data?.code === "ACCOUNT_LOCKED";

    if (isAccountLocked && !isAuthLoginRequest(url)) {
      if (!isHandlingAccountLock) {
        isHandlingAccountLock = true;

        const message = getLockMessage(data);
        notifyAccountLocked({ message });

        setTimeout(() => {
          isHandlingAccountLock = false;
        }, 1000);
      }

      return error.response;
    }

    return Promise.reject(error);
  },
);

export default api;
