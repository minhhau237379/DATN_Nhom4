import { getBackendOrigin } from "./network";

export const getProductImages = (image?: string | string[] | null) => {
  if (!image) {
    return [];
  }

  if (Array.isArray(image)) {
    return image.map((item) => String(item).trim()).filter(Boolean);
  }

  const trimmed = String(image).trim();
  return trimmed ? [trimmed] : [];
};

export const getPrimaryProductImage = (image?: string | string[] | null) =>
  getProductImages(image)[0] || "";

export const resolveImageUri = (image?: string | string[] | null) => {
  const primary = getPrimaryProductImage(image);

  if (!primary) {
    return `${getBackendOrigin()}/images/no-image.png`;
  }

  if (primary.startsWith("http")) {
    return primary;
  }

  if (primary.startsWith("blob:") || primary.startsWith("data:")) {
    return primary;
  }

  return `${getBackendOrigin()}${primary}`;
};
