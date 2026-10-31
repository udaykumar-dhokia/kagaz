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
      ownerPhone?: string | null;
      address?: string | null;
      upiId?: string | null;
      logoUrl?: string | null;
      avatarUrl?: string;
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

export function getDocumentPreviewUrl(fileKey: string): string {
  return `${API_BASE}/jobs/preview?fileKey=${encodeURIComponent(fileKey)}`;
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

// ==========================================
// Shopkeeper Queue & Auth API
// ==========================================

export interface QueueJobLineItem {
  id: string;
  originalFilename: string;
  pageCount: number;
  pageRange: string;
  copies: number;
  colorMode: "BW" | "COLOR";
  paperSize: string;
  isDuplex: boolean;
  itemPrice: string;
  fileKey: string;
}

export interface QueueJob {
  id: string;
  pickupPin: string;
  status: "QUEUED" | "PRINTING" | "COMPLETED" | "CANCELLED";
  totalAmount: string;
  paymentStatus: "UNPAID" | "PAID_CASH" | "PAID_UPI";
  customerPhoneMasked?: string | null;
  expiresAt: string;
  createdAt: string;
  items: QueueJobLineItem[];
}

export async function loginShop(payload: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }
  return data;
}

export async function registerShop(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  address?: string;
  upiId?: string;
  isColorEnabled?: boolean;
  isDuplexEnabled?: boolean;
  bwSinglePrice?: number;
  bwDoublePrice?: number;
  colorSinglePrice?: number;
  colorDoublePrice?: number;
}) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Registration failed");
  }
  return data;
}

export async function fetchShopMe(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to authenticate");
  }
  return data;
}

export async function fetchShopQueue(token: string): Promise<{ success: boolean; data: QueueJob[] }> {
  const res = await fetch(`${API_BASE}/shop/queue`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load counter queue");
  }
  return data;
}

export async function verifyQueuePin(token: string, pin: string) {
  const res = await fetch(`${API_BASE}/shop/queue/verify-pin`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Invalid or expired PIN");
  }
  return data;
}

export async function completeQueueJob(
  token: string,
  jobId: string,
  paymentStatus: "PAID_CASH" | "PAID_UPI" | "UNPAID" = "PAID_CASH"
) {
  const res = await fetch(`${API_BASE}/shop/queue/${jobId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentStatus }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to complete job");
  }
  return data;
}

export async function cancelQueueJob(token: string, jobId: string) {
  const res = await fetch(`${API_BASE}/shop/queue/${jobId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to cancel job");
  }
  return data;
}

// ==========================================
// Phase 4: Settings, Standee & Ledger API
// ==========================================

export interface UpdateCatalogPayload {
  isBwEnabled?: boolean;
  bwSinglePrice?: number;
  bwDoublePrice?: number;
  isColorEnabled?: boolean;
  colorSinglePrice?: number;
  colorDoublePrice?: number;
  isDuplexEnabled?: boolean;
  supportedPaperSizes?: string[];
}

export async function updateShopCatalog(token: string, payload: UpdateCatalogPayload) {
  const res = await fetch(`${API_BASE}/shops/catalog/update`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update catalog settings");
  }
  return data;
}

export async function fetchShopStandee(token: string) {
  const res = await fetch(`${API_BASE}/shops/qr/standee`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to load standee QR assets");
  }
  return data;
}

export async function addShopAddon(
  token: string,
  payload: { name: string; type: "BINDING" | "LAMINATION" | "STAPLING" | "CUSTOM"; price: number }
) {
  const res = await fetch(`${API_BASE}/shops/addons`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to add service");
  }
  return data;
}

export async function deleteShopAddon(token: string, addonId: string) {
  const res = await fetch(`${API_BASE}/shops/addons/${addonId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to remove service");
  }
  return data;
}

export interface DailyLedgerResponse {
  success: boolean;
  data: {
    date: string;
    summary: {
      totalJobsCompleted: number;
      activeQueueCount: number;
      totalRevenue: number;
      cashCollected: number;
      upiCollected: number;
      unpaidAmount: number;
      totalPagesPrinted: number;
      bwPagesPrinted: number;
      colorPagesPrinted: number;
    };
  };
}

export async function fetchDailyLedger(token: string, date?: string): Promise<DailyLedgerResponse> {
  const url = date
    ? `${API_BASE}/shop/ledger/daily?date=${date}`
    : `${API_BASE}/shop/ledger/daily`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch daily ledger");
  }
  return data;
}

export interface LedgerHistoryResponse {
  success: boolean;
  data: {
    jobs: {
      id: string;
      pickupPin: string;
      status: string;
      totalAmount: string;
      paymentStatus: string;
      customerPhoneMasked?: string | null;
      completedAt: string;
      createdAt: string;
    }[];
    pagination: {
      limit: number;
      offset: number;
      count: number;
    };
  };
}

export async function fetchLedgerHistory(
  token: string,
  limit: number = 30,
  offset: number = 0
): Promise<LedgerHistoryResponse> {
  const res = await fetch(
    `${API_BASE}/shop/ledger/history?limit=${limit}&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch order history");
  }
  return data;
}

export interface LedgerAnalyticsResponse {
  success: boolean;
  message?: string;
  data: {
    range: string;
    startDate: string;
    endDate: string;
    isSingleDay: boolean;
    summary: {
      totalRevenue: number;
      cashCollected: number;
      upiCollected: number;
      unpaidAmount: number;
      totalJobsCompleted: number;
      averageOrderValue: number;
      totalPagesPrinted: number;
      bwPagesPrinted: number;
      colorPagesPrinted: number;
      duplexSheetsPrinted: number;
    };
    timeline: {
      key: string;
      label: string;
      date?: string;
      revenue: number;
      orders: number;
      cash: number;
      upi: number;
      bwPages: number;
      colorPages: number;
    }[];
    breakdown: {
      cashPercentage: number;
      upiPercentage: number;
      unpaidPercentage: number;
      bwPercentage: number;
      colorPercentage: number;
      peakHour: string;
    };
  };
}

export async function fetchLedgerAnalytics(
  token: string,
  params: {
    range?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
  }
): Promise<LedgerAnalyticsResponse> {
  const query = new URLSearchParams();
  if (params.range) query.set("range", params.range);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);

  const res = await fetch(`${API_BASE}/shop/ledger/analytics?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch analytics");
  }
  return data;
}

export interface EnrichedHistoryJob {
  id: string;
  pickupPin: string;
  status: string;
  totalAmount: string;
  paymentStatus: string;
  customerPhoneMasked?: string | null;
  completedAt: string;
  createdAt: string;
  items: {
    id: string;
    jobId: string;
    originalFilename: string;
    pageCount: number;
    pageRange: string;
    copies: number;
    colorMode: string;
    paperSize: string;
    isDuplex: boolean;
    itemPrice: string;
  }[];
}

export interface FilteredLedgerHistoryResponse {
  success: boolean;
  message?: string;
  data: {
    jobs: EnrichedHistoryJob[];
    pagination: {
      limit: number;
      offset: number;
      count: number;
      totalCount: number;
    };
  };
}

export async function fetchFilteredLedgerHistory(
  token: string,
  params: {
    range?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }
): Promise<FilteredLedgerHistoryResponse> {
  const query = new URLSearchParams();
  if (params.range) query.set("range", params.range);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus);
  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.limit !== undefined) query.set("limit", params.limit.toString());
  if (params.offset !== undefined) query.set("offset", params.offset.toString());

  const res = await fetch(`${API_BASE}/shop/ledger/history?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch order history");
  }
  return data;
}

export async function updateLedgerPayment(
  token: string,
  jobId: string,
  paymentStatus: "PAID_CASH" | "PAID_UPI" | "UNPAID"
) {
  const res = await fetch(`${API_BASE}/shop/ledger/${jobId}/payment`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentStatus }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update payment status");
  }
  return data;
}

export interface ShopBillingStatusResponse {
  success: boolean;
  message?: string;
  data: {
    status: "TRIAL" | "ACTIVE" | "EXPIRED";
    isTrialActive: boolean;
    trialDaysRemaining: number;
    trialEndsAt: string;
    isSubscriptionActive: boolean;
    subscriptionEndsAt: string | null;
    canAccessPlatform: boolean;
    currentPlan: string;
    lastTransaction: {
      id: string;
      amount: string;
      currency: string;
      status: string;
      planType: string;
      createdAt: string;
    } | null;
  };
}

export async function fetchShopBillingStatus(token: string): Promise<ShopBillingStatusResponse> {
  const res = await fetch(`${API_BASE}/shop/billing/status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch billing status");
  }
  return data;
}

export interface DodoCheckoutResponse {
  success: boolean;
  message?: string;
  data: {
    sessionId: string;
    checkoutUrl: string;
  };
}

export async function createDodoCheckoutSession(
  token: string,
  params?: { productId?: string; returnUrl?: string }
): Promise<DodoCheckoutResponse> {
  const res = await fetch(`${API_BASE}/shop/billing/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params || {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to initiate payment checkout");
  }
  return data;
}

export async function verifyShopPayment(
  token: string,
  params?: { paymentId?: string; subscriptionId?: string }
): Promise<ShopBillingStatusResponse> {
  const res = await fetch(`${API_BASE}/shop/billing/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params || {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to verify payment status");
  }
  return data;
}

export interface SubscriptionTransactionItem {
  id: string;
  dodoPaymentId: string | null;
  amount: string;
  currency: string;
  status: string;
  planType: string;
  createdAt: string;
}

export interface SubscriptionHistoryResponse {
  success: boolean;
  message?: string;
  data: {
    transactions: SubscriptionTransactionItem[];
  };
}

export async function fetchBillingHistory(
  token: string
): Promise<SubscriptionHistoryResponse> {
  const res = await fetch(`${API_BASE}/shop/billing/history`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch transaction history");
  }
  return data;
}

export interface ShopProfile {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  address?: string | null;
  upiId?: string | null;
  logoUrl?: string | null;
  avatarUrl: string;
  isActive: boolean;
  trialEndsAt?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: string | null;
  currentPlan?: string | null;
  createdAt: string;
}

export interface ShopProfileResponse {
  success: boolean;
  message?: string;
  data: ShopProfile;
}

export interface UpdateShopProfilePayload {
  name?: string;
  ownerPhone?: string | null;
  address?: string | null;
  upiId?: string | null;
}

export async function fetchShopProfile(token: string): Promise<ShopProfileResponse> {
  const res = await fetch(`${API_BASE}/shops/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch shop profile");
  }
  return data;
}

export async function updateShopProfile(
  token: string,
  payload: UpdateShopProfilePayload
): Promise<ShopProfileResponse> {
  const res = await fetch(`${API_BASE}/shops/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to update shop profile");
  }
  return data;
}

export async function uploadShopLogo(
  token: string,
  file: File
): Promise<{ success: boolean; message: string; data: { logoUrl: string; avatarUrl: string } }> {
  const formData = new FormData();
  formData.append("logo", file);

  const res = await fetch(`${API_BASE}/shops/logo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to upload shop logo");
  }
  return data;
}

export async function deleteShopLogo(
  token: string
): Promise<{ success: boolean; message: string; data: { logoUrl: null; avatarUrl: string } }> {
  const res = await fetch(`${API_BASE}/shops/logo`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to remove shop logo");
  }
  return data;
}






