"use client";

import React, { useEffect, useState } from "react";
import { QrCode, Printer, Download, Sparkles, ShieldCheck, Store, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KagazLogo } from "@/components/ui/logo";
import { toast } from "sonner";
import { fetchShopStandee } from "@/lib/api";
import { useAppSelector } from "@/lib/store/hooks";
import { getShopAvatarUrl } from "@/lib/avatar";

export default function DashboardStandeePage() {
  const currentShop = useAppSelector((state) => state.auth.shop);
  const [token, setToken] = useState<string | null>(null);
  const [storedShopName, setStoredShopName] = useState<string>("My Print Shop");
  const [qrData, setQrData] = useState<{ url: string; dataUrl: string; svg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const shopName = currentShop?.name || storedShopName;
  const shopLogoUrl = currentShop?.logoUrl;

  useEffect(() => {
    const storedToken = localStorage.getItem("kagaz_shop_token");
    const rawShop = localStorage.getItem("kagaz_shop_data");

    if (rawShop) {
      try {
        setStoredShopName(JSON.parse(rawShop).name);
      } catch {}
    }

    setToken(storedToken);

    if (storedToken) {
      fetchShopStandee(storedToken)
        .then((res) => {
          setQrData(res.data);
        })
        .catch((err) => {
          console.error("Failed to load standee:", err);
          toast.error("Failed to load standee");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const handlePrintStandee = () => {
    window.print();
  };

  const handleCopyUrl = () => {
    if (!qrData?.url) return;
    navigator.clipboard.writeText(qrData.url);
    setCopied(true);
    toast.success("Shop portal URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQrPng = () => {
    if (!qrData?.dataUrl) return;
    const a = document.createElement("a");
    a.href = qrData.dataUrl;
    a.download = `kagaz-qr-${shopName.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
        <p className="text-xs text-neutral-500">Generating print-ready standee...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Counter Standee Studio
          </h1>
          <p className="text-xs text-neutral-500">
            Print this counter standee for your counter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQrPng}
            className="text-xs font-medium h-9 px-3 rounded-lg"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Download PNG
          </Button>

          <Button
            size="sm"
            onClick={handlePrintStandee}
            className="text-xs font-medium h-9 px-3 rounded-lg shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Print Standee
          </Button>
        </div>
      </div>

      {/* Standee Card Preview (Styled for both Screen and Physical Paper Print) */}
      <div className="flex justify-center py-2">
        <div
          id="print-standee-card"
          className="w-full max-w-md bg-white text-neutral-900 p-6 sm:p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs text-center space-y-5 print:border-none print:shadow-none print:m-0 print:p-6"
        >
          {/* Header - Shop Logo & Name */}
          <div className="pt-2 flex flex-col items-center gap-2.5">
            <img
              src={getShopAvatarUrl(shopName, shopLogoUrl)}
              alt={shopName}
              className="h-16 w-16 rounded-2xl object-cover border border-neutral-200 shadow-2xs"
            />
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
              {shopName}
            </h2>
          </div>

          {/* QR Code in Center */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 inline-block mx-auto">
            {qrData?.dataUrl && (
              <img
                src={qrData.dataUrl}
                alt="Shop standee QR code"
                className="w-48 h-48 mx-auto object-contain"
              />
            )}
          </div>

          {/* 3 Step Instructions */}
          <div className="space-y-2 text-left bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-medium text-xs">
                1
              </span>
              <span className="text-xs font-medium text-neutral-800">
                Scan this QR code with your phone camera
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-medium text-xs">
                2
              </span>
              <span className="text-xs font-medium text-neutral-800">
                Upload your document & select options
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-medium text-xs">
                3
              </span>
              <span className="text-xs font-medium text-neutral-800">
                Share your 4-digit PIN at the counter to print
              </span>
            </div>
          </div>

          {/* Privacy Trust Seal */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 py-1.5 rounded-lg border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Private • No WhatsApp • Auto-Deleted on Print</span>
          </div>

          {/* Powered by Kagaz with logo */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-neutral-600">
            <span className="text-xs font-normal">powered by</span>
            <KagazLogo className="h-4.5 w-auto" />
          </div>
        </div>
      </div>

      {/* Direct Link Share Card */}
      <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl print:hidden">
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Direct Customer Link:</span>
            <p className="text-neutral-500 font-mono text-[11px] truncate max-w-sm">{qrData?.url}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="text-xs font-medium h-8 px-3 rounded-lg shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

