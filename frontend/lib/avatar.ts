/**
 * Resolves the shop logo URL. If a custom Cloudinary/storage URL is provided,
 * returns it. Otherwise, generates a deterministic DiceBear avatar based on shop name.
 */
export function getShopAvatarUrl(name?: string | null, customLogoUrl?: string | null): string {
  if (customLogoUrl && customLogoUrl.trim().length > 0) {
    return customLogoUrl.trim();
  }
  const cleanName = (name || "Kagaz").trim();
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(cleanName)}`;
}

