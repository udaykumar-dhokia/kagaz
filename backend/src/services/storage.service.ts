import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { env } from "../config/env";

export interface SignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  storageMode: "cloudinary" | "local";
  fields?: {
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
    resourceType: string;
  };
}

const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_URL || (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)
);

if (isCloudinaryConfigured) {
  if (env.CLOUDINARY_URL) {
    cloudinary.config({ cloudinary_url: env.CLOUDINARY_URL });
  } else {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "temp/uploads");

async function ensureLocalDir() {
  if (!existsSync(LOCAL_STORAGE_DIR)) {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

/**
 * Generates direct signed upload parameters for Cloudinary
 * or falls back to local direct upload if credentials are not configured.
 */
export async function generatePresignedUploadUrl(
  shopId: string,
  originalFilename: string,
  contentType: string = "application/pdf"
): Promise<SignedUploadResult> {
  const sanitized = sanitizeFilename(originalFilename);
  const randomToken = crypto.randomBytes(6).toString("hex");
  const folder = `kagaz/uploads/${shopId}`;
  const publicId = `${Date.now()}-${randomToken}-${sanitized}`;
  const fileKey = `${folder}/${publicId}`;

  if (isCloudinaryConfigured) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || cloudinary.config().cloud_name;
    const apiKey = env.CLOUDINARY_API_KEY || cloudinary.config().api_key;
    const apiSecret = env.CLOUDINARY_API_SECRET || cloudinary.config().api_secret;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary configuration incomplete");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const resourceType = "raw"; // Standard for raw PDFs and documents

    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    return {
      uploadUrl,
      fileKey,
      storageMode: "cloudinary",
      fields: {
        apiKey,
        timestamp,
        signature,
        folder,
        publicId,
        resourceType,
      },
    };
  }

  // Local fallback mode for development
  await ensureLocalDir();
  return {
    uploadUrl: `/api/v1/jobs/upload-direct?fileKey=${encodeURIComponent(fileKey)}`,
    fileKey,
    storageMode: "local",
  };
}

export async function saveLocalFile(fileKey: string, buffer: Buffer): Promise<void> {
  await ensureLocalDir();
  const filePath = path.join(LOCAL_STORAGE_DIR, path.basename(fileKey));
  await fs.writeFile(filePath, buffer);
}

/**
 * Retrieves the raw document buffer for PDF inspection or print spooling.
 */
export async function getFileBuffer(fileKey: string): Promise<Buffer> {
  if (isCloudinaryConfigured) {
    // 1. Primary: Authenticated private download URL (bypasses Cloudinary's default PDF CDN restrictions)
    try {
      const rawDownloadUrl = cloudinary.utils.private_download_url(fileKey, "", {
        resource_type: "raw",
        type: "upload",
      });
      const response = await fetch(rawDownloadUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.warn(`[Storage] Private raw download attempt failed for ${fileKey}:`, err);
    }

    // 2. Fallback: Authenticated private download URL with resource_type: "image"
    try {
      const imgDownloadUrl = cloudinary.utils.private_download_url(fileKey, "", {
        resource_type: "image",
        type: "upload",
      });
      const imgResp = await fetch(imgDownloadUrl);
      if (imgResp.ok) {
        const arrayBuffer = await imgResp.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.warn(`[Storage] Private image download attempt failed for ${fileKey}:`, err);
    }

    // 3. Fallback: Signed CDN URL
    try {
      const signedCdnUrl = cloudinary.url(fileKey, {
        resource_type: "raw",
        secure: true,
        sign_url: true,
      });
      const cdnResp = await fetch(signedCdnUrl);
      if (cdnResp.ok) {
        const arrayBuffer = await cdnResp.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.warn(`[Storage] Signed CDN download attempt failed for ${fileKey}:`, err);
    }

    throw new Error(`Failed to download file from Cloudinary: All retrieval strategies failed for ${fileKey}`);
  }

  // Local fallback
  const filePath = path.join(LOCAL_STORAGE_DIR, path.basename(fileKey));
  return await fs.readFile(filePath);
}

/**
 * Permanently shreds and deletes the customer file from storage.
 */
export async function deleteDocument(fileKey: string): Promise<void> {
  try {
    if (isCloudinaryConfigured) {
      // Try deleting as raw
      const result = await cloudinary.uploader.destroy(fileKey, { resource_type: "raw" });
      if (result.result !== "ok") {
        // Fallback try image resource_type
        await cloudinary.uploader.destroy(fileKey, { resource_type: "image" });
      }
      return;
    }

    // Local fallback deletion
    const filePath = path.join(LOCAL_STORAGE_DIR, path.basename(fileKey));
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (err) {
    console.warn(`Failed to shred document ${fileKey}:`, err);
  }
}

/**
 * Uploads shop logo to Cloudinary folder "kagaz/shop_logos"
 * or stores locally / returns data URI if Cloudinary is not configured.
 */
export async function uploadShopLogoImage(
  shopId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (isCloudinaryConfigured) {
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "kagaz/shop_logos",
      public_id: `shop_${shopId}`,
      overwrite: true,
      invalidate: true,
      resource_type: "image",
      transformation: [
        { width: 400, height: 400, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });
    return result.secure_url;
  }

  // Local fallback mode: base64 data URI (universal, zero external dependency)
  const base64Data = buffer.toString("base64");
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Deletes custom shop logo from Cloudinary if stored there.
 */
export async function deleteShopLogoImage(shopId: string): Promise<void> {
  if (isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(`kagaz/shop_logos/shop_${shopId}`, {
        resource_type: "image",
        invalidate: true,
      });
    } catch (err) {
      console.warn(`Failed to destroy Cloudinary logo for shop ${shopId}:`, err);
    }
  }
}

