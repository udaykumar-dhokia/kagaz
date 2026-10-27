export function maskPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;

  const cleaned = phone.trim().replace(/\s+/g, "");
  if (cleaned.length < 4) return "****";

  const visibleTrailingDigits = 4;
  const trailing = cleaned.slice(-visibleTrailingDigits);

  if (cleaned.startsWith("+91") && cleaned.length >= 12) {
    return `+91 ******${trailing}`;
  }

  return `******${trailing}`;
}

