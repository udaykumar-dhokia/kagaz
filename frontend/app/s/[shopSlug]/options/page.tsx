"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Store } from "lucide-react";
import { fetchShopCatalog, type ShopCatalogResponse, type CreateOrderResponse } from "@/lib/api";
import { PrintConfigurator } from "@/components/customer/print-configurator";
import type { UploadedDocument } from "@/components/customer/file-dropzone";
import { Button } from "@/components/ui/button";
import { KagazLogo } from "@/components/ui/logo";
import { getShopAvatarUrl } from "@/lib/avatar";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  loadShopCatalog,
  setPendingDoc,
  clearPendingDoc,
} from "@/lib/store/slices/customerSlice";

function OptionsContent({ paramsPromise }: { paramsPromise: Promise<{ shopSlug: string }> }) {
  const { shopSlug } = use(paramsPromise);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { shopData, pendingDoc: doc, isLoading } = useAppSelector(
    (state) => state.customer
  );

  useEffect(() => {
    // 1. If doc is not in Redux, check session or localStorage
    if (!doc) {
      let storedDoc = sessionStorage.getItem(`kagaz_doc_${shopSlug}`);
      if (!storedDoc) {
        storedDoc = localStorage.getItem(`kagaz_pending_doc_${shopSlug}`);
      }

      if (!storedDoc) {
        router.replace(`/s/${shopSlug}`);
        return;
      }

      try {
        dispatch(setPendingDoc(JSON.parse(storedDoc)));
      } catch {
        router.replace(`/s/${shopSlug}`);
        return;
      }
    }

    // 2. Fetch catalog if not loaded yet
    if (!shopData) {
      dispatch(loadShopCatalog(shopSlug));
    }
  }, [shopSlug, router, doc, shopData, dispatch]);

  const handleOrderCreated = (orderData: CreateOrderResponse["data"]) => {
    dispatch(clearPendingDoc());
    sessionStorage.removeItem(`kagaz_doc_${shopSlug}`);
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
          <Button variant="ghost" size="sm" className="text-xs -ml-2 text-neutral-600 dark:text-neutral-400 h-8 rounded-lg">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src={getShopAvatarUrl(shopData.shop.name, shopData.shop.logoUrl)}
            alt={shopData.shop.name}
            className="h-5 w-5 rounded-md object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
          />
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">
            {shopData.shop.name}
          </span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Print Specifications
        </h1>
        <p className="text-xs text-neutral-500">
          Customize pages, color, and copies
        </p>
      </div>

      {/* Configurator */}
      <PrintConfigurator
        shopSlug={shopSlug}
        doc={doc}
        catalog={shopData.catalog}
        onOrderCreated={handleOrderCreated}
      />

      {/* Powered by Kagaz with logo */}
      <div className="pt-2 pb-4 flex items-center justify-center gap-1.5 text-neutral-500">
        <span className="text-xs font-normal">powered by</span>
        <KagazLogo className="h-4.5 w-auto" />
      </div>
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

