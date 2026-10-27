export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export interface ShopCatalogResponse {
  success: boolean;
  message?: string;
  data: {
    shop: {
      id: string;
      name: string;
      slug: string;
    };
    catalog: {
      isBwEnabled: boolean;
      bwSinglePrice: string;
      bwDoublePrice: string;
      isColorEnabled: boolean;
      colorSinglePrice: string;
      colorDoublePrice: string;
      isDuplexEnabled: boolean;
      supportedPaperSizes: string[];
      addons: {
        id: string;
        name: string;
        type: string;
        price: string;
      }[];
    };
  };
}

export interface PresignedUploadResponse {
  success: boolean;
  message?: string;
  data: {
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
  };
}

export interface PdfInspectionResponse {
  success: boolean;
  message?: string;
  data: {
    pageCount: number;
    detectedPaperSize: "A4" | "LEGAL" | "A3" | "CUSTOM";
    isEncrypted: boolean;
    pageDimensions: { width: number; height: number };
  };
}

export interface QuoteRequestItem {
  pageCount: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  paperSize: string;
  isDuplex: boolean;
}

export interface QuoteResponse {
  success: boolean;
  message?: string;
  data: {
    items: {
      ratePerUnit: number;
      pageCount: number;
      copies: number;
      colorMode: "BW" | "COLOR";
      isDuplex: boolean;
      itemTotal: number;
    }[];
    addons: { id: string; name: string; price: number }[];
    subtotalItems: number;
    subtotalAddons: number;
    totalAmount: number;
  };
}

export interface CreateOrderPayload {
  shopSlug: string;
  customerPhone?: string;
  items: {
    fileKey: string;
    originalFilename: string;
    fileSize: number;
    pageCount: number;
    pageRange: string;
    copies: number;
    colorMode: "BW" | "COLOR";
    paperSize: string;
    isDuplex: boolean;
  }[];
  selectedAddonIds: string[];
}

export interface CreateOrderResponse {
  success: boolean;
  message?: string;
  data: {
    jobId: string;
    pickupPin: string;
    shopName: string;
    totalAmount: string;
    status: string;
    customerPhoneMasked?: string | null;
    expiresAt: string;
    summary: {
      itemsCount: number;
      totalPages: number;
      subtotalItems: number;
      subtotalAddons: number;
    };
  };
}

export interface JobStatusResponse {
  success: boolean;
  message?: string;
  data: {
    id: string;
    pickupPin: string;
    status: string;
    totalAmount: string;
    paymentStatus: string;
    expiresAt: string;
    completedAt?: string | null;
    createdAt: string;
  };
}

// ==========================================
// API Functions
// ==========================================

export async function fetchShopCatalog(slug: string): Promise<ShopCatalogResponse> {
  const res = await fetch(`${API_BASE}/shops/${slug}/catalog`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to load shop details");
  }
  return res.json();
}

export async function requestPresignedUpload(
  shopSlug: string,
  filename: string,
  contentType: string = "application/pdf"
): Promise<PresignedUploadResponse> {
  const res = await fetch(`${API_BASE}/jobs/presigned-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shopSlug, filename, contentType }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to generate upload ticket");
  }
  return res.json();
}

export function uploadFileWithProgress(
  uploadInfo: PresignedUploadResponse["data"],
  file: File,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(uploadInfo.fileKey);
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during file upload"));
    });

    if (uploadInfo.storageMode === "cloudinary" && uploadInfo.fields) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", uploadInfo.fields.apiKey);
      formData.append("timestamp", uploadInfo.fields.timestamp.toString());
      formData.append("signature", uploadInfo.fields.signature);
      formData.append("folder", uploadInfo.fields.folder);
      formData.append("public_id", uploadInfo.fields.publicId);

      xhr.open("POST", uploadInfo.uploadUrl);
      xhr.send(formData);
    } else {
      // Local fallback mode
      const formData = new FormData();
      formData.append("file", file);
      const url = `${API_BASE.replace("/api/v1", "")}${uploadInfo.uploadUrl}`;
      xhr.open("POST", url);
      xhr.send(formData);
    }
  });
}

export async function inspectUploadedPdf(fileKey: string): Promise<PdfInspectionResponse> {
  const res = await fetch(`${API_BASE}/jobs/inspect-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileKey }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to inspect PDF");
  }
  return res.json();
}

export async function fetchOrderQuote(
  shopSlug: string,
  items: QuoteRequestItem[],
  selectedAddonIds: string[] = []
): Promise<QuoteResponse> {
  const res = await fetch(`${API_BASE}/jobs/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shopSlug, items, selectedAddonIds }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to calculate quote");
  }
  return res.json();
}

export async function submitPrintOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to place order");
  }
  return res.json();
}

export async function fetchJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/status`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch job status");
  }
  return res.json();
}

