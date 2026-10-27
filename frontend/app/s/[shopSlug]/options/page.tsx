"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Store } from "lucide-react";
import { fetchShopCatalog, type ShopCatalogResponse, type CreateOrderResponse } from "@/lib/api";
import { PrintConfigurator } from "@/components/customer/print-configurator";
import type { UploadedDocument } from "@/components/customer/file-dropzone";
import { Button } from "@/components/ui/button";

function OptionsContent({ paramsPromise }: { paramsPromise: Promise<{ shopSlug: string }> }) {
  const { shopSlug } = use(paramsPromise);
  const router = useRouter();

  const [shopData, setShopData] = useState<ShopCatalogResponse["data"] | null>(null);
  const [doc, setDoc] = useState<UploadedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Retrieve doc from session or local storage (resilient against refresh / tab close)
    let storedDoc = sessionStorage.getItem(`kagaz_doc_${shopSlug}`);
    if (!storedDoc) {
      storedDoc = localStorage.getItem(`kagaz_pending_doc_${shopSlug}`);
    }

    if (!storedDoc) {
      router.replace(`/s/${shopSlug}`);
      return;
    }

    try {
      setDoc(JSON.parse(storedDoc));
    } catch {
      router.replace(`/s/${shopSlug}`);
      return;
    }

    // 2. Fetch catalog
    fetchShopCatalog(shopSlug)
      .then((res) => {
        setShopData(res.data);
      })
      .catch((err) => {
        console.error("Error fetching catalog:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [shopSlug, router]);

  const handleOrderCreated = (orderData: CreateOrderResponse["data"]) => {
    // Clear the uploaded doc from session storage to avoid accidental re-orders
    sessionStorage.removeItem(`kagaz_doc_${shopSlug}`);
    // Navigate to ticket screen
    router.push(`/s/${shopSlug}/ticket/${orderData.jobId}`);
  };

  if (isLoading || !doc || !shopData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-10 w-10 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm text-neutral-500 font-medium">Loading options & rates...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Link href={`/s/${shopSlug}`}>
          <Button variant="ghost" size="sm" className="text-xs -ml-2 text-neutral-600 dark:text-neutral-400">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Upload
          </Button>
        </Link>
        <span className="text-xs font-semibold text-neutral-500 truncate max-w-[200px]">
          {shopData.shop.name}
        </span>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-neutral-50">
          Print Specifications
        </h1>
        <p className="text-xs text-neutral-500">
          Customize pages, color, and copies. The counter will print with these exact settings.
        </p>
      </div>

      {/* Configurator */}
      <PrintConfigurator
        shopSlug={shopSlug}
        doc={doc}
        catalog={shopData.catalog}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}

export default function CustomerOptionsPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  return (
    <main className="min-h-screen bg-neutral-50/40 dark:bg-neutral-950 flex flex-col items-center py-6 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-10 w-10 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-500 font-medium">Loading...</p>
          </div>
        }
      >
        <OptionsContent paramsPromise={params} />
      </Suspense>
    </main>
  );
}

