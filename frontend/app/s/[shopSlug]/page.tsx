"use client";

import React, { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Sparkles, ArrowRight, Store, Clock, ExternalLink, X } from "lucide-react";
import { fetchShopCatalog, fetchJobStatus, type ShopCatalogResponse } from "@/lib/api";
import { FileDropzone, type UploadedDocument } from "@/components/customer/file-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ActiveRecoveryJob {
  jobId: string;
  pickupPin: string;
  totalAmount: string;
  status: string;
}

function ShopContent({ paramsPromise }: { paramsPromise: Promise<{ shopSlug: string }> }) {
  const { shopSlug } = use(paramsPromise);
  const router = useRouter();

  const [shopData, setShopData] = useState<ShopCatalogResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
  const [activeRecoveryJob, setActiveRecoveryJob] = useState<ActiveRecoveryJob | null>(null);

  useEffect(() => {
    if (!shopSlug) return;

    let isMounted = true;
    setIsLoading(true);

    // 1. Fetch shop catalog
    fetchShopCatalog(shopSlug)
      .then((res) => {
        if (isMounted) {
          setShopData(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Unable to reach shop. Please verify the QR code.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // 2. Check if user already has an active order in localStorage (Refresh / Re-scan resilience)
    if (typeof window !== "undefined") {
      const storedActiveJob = localStorage.getItem(`kagaz_active_job_${shopSlug}`);
      if (storedActiveJob) {
        try {
          const parsed = JSON.parse(storedActiveJob);
          // Verify with server if job is still active
          fetchJobStatus(parsed.jobId)
            .then((statusRes) => {
              if (
                isMounted &&
                (statusRes.data.status === "QUEUED" || statusRes.data.status === "PRINTING")
              ) {
                setActiveRecoveryJob({
                  jobId: parsed.jobId,
                  pickupPin: statusRes.data.pickupPin,
                  totalAmount: statusRes.data.totalAmount,
                  status: statusRes.data.status,
                });
              } else {
                // Job is COMPLETED or EXPIRED, remove from local storage
                localStorage.removeItem(`kagaz_active_job_${shopSlug}`);
              }
            })
            .catch(() => {
              localStorage.removeItem(`kagaz_active_job_${shopSlug}`);
            });
        } catch {
          localStorage.removeItem(`kagaz_active_job_${shopSlug}`);
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [shopSlug]);

  const handleDocumentReady = (doc: UploadedDocument) => {
    setUploadedDoc(doc);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`kagaz_doc_${shopSlug}`, JSON.stringify(doc));
      localStorage.setItem(`kagaz_pending_doc_${shopSlug}`, JSON.stringify(doc));
    }
  };

  const handleProceedToOptions = () => {
    if (!uploadedDoc) return;
    router.push(`/s/${shopSlug}/options`);
  };

  const handleDismissRecovery = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`kagaz_active_job_${shopSlug}`);
    }
    setActiveRecoveryJob(null);
  };

  const handleGoToTicket = () => {
    if (!activeRecoveryJob) return;
    router.push(`/s/${shopSlug}/ticket/${activeRecoveryJob.jobId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-10 w-10 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm text-neutral-500 font-medium">Connecting to print shop...</p>
      </div>
    );
  }

  if (error || !shopData) {
    return (
      <Card className="max-w-md w-full border-neutral-200 dark:border-neutral-800 shadow-sm p-6 text-center my-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4">
          <Store className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Shop Not Found</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
          {error || "This print shop is currently not active or the QR code has expired."}
        </p>
        <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
          Refresh & Try Again
        </Button>
      </Card>
    );
  }

  const { shop, catalog } = shopData;

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Top Branding & Shop Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Kagaz Instant Print</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-neutral-50">
          {shop.name}
        </h1>

        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Counter Active • Ready to Print
          </span>
        </div>
      </div>

      {/* ACTIVE TICKET RECOVERY BANNER */}
      {activeRecoveryJob && (
        <Card className="border-2 border-primary bg-primary/5 dark:bg-primary/10 shadow-sm p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-neutral-950 dark:text-neutral-50">
                    Active job pin: {activeRecoveryJob.pickupPin}
                  </h4>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {activeRecoveryJob.status === "PRINTING" ? "Printing now" : "In queue"}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                  Amount: ₹{activeRecoveryJob.totalAmount} • You have a ticket waiting.
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismissRecovery}
              className="h-6 w-6 text-neutral-400 hover:text-neutral-700"
              title="Dismiss and start new print"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-primary/15">
            <Button
              size="sm"
              onClick={handleGoToTicket}
              className="flex-1 h-9 rounded-lg text-xs font-bold shadow-xs"
            >
              <span>View My Ticket</span>
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismissRecovery}
              className="h-9 rounded-lg text-xs font-medium"
            >
              Start New Print
            </Button>
          </div>
        </Card>
      )}

      {/* Available Rates Bar */}
      <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs bg-white dark:bg-neutral-900">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
            Available at this shop:
          </p>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {catalog.isBwEnabled && (
              <Badge variant="secondary" className="font-medium">
                B&W: ₹{catalog.bwSinglePrice}/pg
              </Badge>
            )}
            {catalog.isColorEnabled && (
              <Badge variant="secondary" className="font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                Color: ₹{catalog.colorSinglePrice}/pg
              </Badge>
            )}
            {catalog.isDuplexEnabled && (
              <Badge variant="secondary" className="font-medium">
                Duplex: ₹{catalog.bwDoublePrice}/side
              </Badge>
            )}
            {catalog.addons.map((a) => (
              <Badge key={a.id} variant="outline" className="font-normal text-neutral-600 dark:text-neutral-400">
                {a.name} (+₹{a.price})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dropzone */}
      <div className="space-y-4">
        <FileDropzone
          shopSlug={shopSlug}
          onDocumentReady={handleDocumentReady}
          onReset={() => {
            setUploadedDoc(null);
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(`kagaz_doc_${shopSlug}`);
              localStorage.removeItem(`kagaz_pending_doc_${shopSlug}`);
            }
          }}
        />

        {/* Continue Button */}
        {uploadedDoc && (
          <Button
            onClick={handleProceedToOptions}
            className="w-full h-12 rounded-xl text-base font-semibold shadow-sm flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <span>Choose Print Settings</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Separator className="my-6 bg-neutral-200 dark:bg-neutral-800" />

      {/* Security & Privacy Banner */}
      <Card className="border border-neutral-200/60 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-950/40 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kagaz Privacy Guarantee</span>
          </div>

          <ul className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>No need to share your personal WhatsApp or phone number.</li>
            <li>Document streams directly to the counter printer.</li>
            <li>Files are automatically shredded and deleted immediately upon printing.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export default function CustomerShopUploadPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  return (
    <main className="min-h-screen bg-neutral-50/40 dark:bg-neutral-950 flex flex-col items-center py-8 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-10 w-10 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-500 font-medium">Loading shop details...</p>
          </div>
        }
      >
        <ShopContent paramsPromise={params} />
      </Suspense>
    </main>
  );
}
