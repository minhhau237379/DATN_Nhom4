const normalizeProductImages = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
};

const getPrimaryProductImage = (value) => normalizeProductImages(value)[0] || "";

const normalizeProductRecord = (product) => {
  if (!product) {
    return product;
  }

  const image = normalizeProductImages(product.image);

  return {
    ...product,
    image,
    primaryImage: image[0] || "",
  };
};

module.exports = {
  normalizeProductImages,
  getPrimaryProductImage,
  normalizeProductRecord,
};
