import { Platform } from "react-native";

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || "";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeBase = (value: string) => stripTrailingSlash(value);

export const getBackendOrigin = () => {
  if (rawApiUrl) {
    return normalizeBase(rawApiUrl.replace(/\/api$/, ""));
  }

  if (__DEV__) {
    return Platform.select({
      android: "http://10.0.2.2:3003",
      ios: "http://localhost:3003",
      default: "http://localhost:3003",
    }) as string;
  }

  return "http://localhost:3003";
};

export const getApiBaseUrl = () => {
  if (rawApiUrl) {
    return rawApiUrl.endsWith("/api")
      ? normalizeBase(rawApiUrl)
      : `${normalizeBase(rawApiUrl)}/api`;
  }

  return `${getBackendOrigin()}/api`;
};

