import QRCode from "qrcode";
import { env } from "../config/env";

export interface GeneratedQrResult {
  url: string;
  dataUrl: string;
  svg: string;
}

export async function generateShopQr(slug: string): Promise<GeneratedQrResult> {
  const shopCustomerUrl = `${env.APP_BASE_URL}/s/${slug}`;

  // Generate Base64 Data URL (PNG)
  const dataUrl = await QRCode.toDataURL(shopCustomerUrl, {
    width: 600,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H", // High error correction for reliable scanning from phone cameras
  });

  // Generate SVG string for high-res print standees
  const svg = await QRCode.toString(shopCustomerUrl, {
    type: "svg",
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });

  return {
    url: shopCustomerUrl,
    dataUrl,
    svg,
  };
}
