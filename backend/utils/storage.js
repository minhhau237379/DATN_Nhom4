const fs = require("fs/promises");
const path = require("path");

const sanitizeFolderName = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "uncategorized";

const getPublicImagePath = (folder, filename) =>
  `/images/products/${folder}/${filename}`;

const saveImageBuffer = async ({ buffer, folder, originalname }) => {
  const safeFolder = sanitizeFolderName(folder);
  const rootDir = path.join(__dirname, "..", "public", "images", "products", safeFolder);
  await fs.mkdir(rootDir, { recursive: true });

  const ext = path.extname(originalname || "").toLowerCase() || ".jpg";
  const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(rootDir, safeName);

  await fs.writeFile(filePath, buffer);

  return getPublicImagePath(safeFolder, safeName);
};

module.exports = {
  saveImageBuffer,
  sanitizeFolderName,
  getPublicImagePath,
};
