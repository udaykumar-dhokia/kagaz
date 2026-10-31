/**
 * Resolves the shop logo URL. If customLogoUrl exists, returns it;
 * otherwise generates a deterministic DiceBear SVG avatar using the shop's name.
 */
export function getShopAvatarUrl(name?: string | null, customLogoUrl?: string | null): string {
  if (customLogoUrl && customLogoUrl.trim().length > 0) {
    return customLogoUrl.trim();
  }
  const cleanName = (name || "Kagaz").trim();
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(cleanName)}`;
}

