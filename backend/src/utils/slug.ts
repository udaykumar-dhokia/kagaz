import crypto from "crypto";

export function generateShopSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-alphanumeric chars
    .replace(/[\s_-]+/g, "-")  // replace spaces and underscores with hyphen
    .replace(/^-+|-+$/g, "");   // trim hyphens

  // Suffix a 4-character random hex to ensure high collision resistance
  const randomSuffix = crypto.randomBytes(2).toString("hex");
  return `${baseSlug || "shop"}-${randomSuffix}`;
}

export function generateQrToken(): string {
  return crypto.randomBytes(16).toString("hex");
}
