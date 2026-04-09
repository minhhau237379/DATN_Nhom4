const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const getBackendOrigin = () => {
  const envApi = import.meta.env.VITE_API_BASE_URL?.trim();

  if (envApi) {
    return stripTrailingSlash(envApi.replace(/\/api$/, ""));
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    const { protocol, hostname } = window.location;

    return stripTrailingSlash(`${protocol}//${hostname}:3003`);
  }

  return "http://localhost:3003";
};

export const getApiBaseUrl = () => {
  const envApi = import.meta.env.VITE_API_BASE_URL?.trim();

  if (envApi) {
    return stripTrailingSlash(envApi);
  }

  return `${getBackendOrigin()}/api`;
};
