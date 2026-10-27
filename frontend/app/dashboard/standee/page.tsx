"use client";

import React, { useEffect, useState } from "react";
import { QrCode, Printer, Download, Sparkles, ShieldCheck, Store, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchShopStandee } from "@/lib/api";

export default function DashboardStandeePage() {
  const [token, setToken] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("My Print Shop");
  const [qrData, setQrData] = useState<{ url: string; dataUrl: string; svg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("kagaz_shop_token");
    const rawShop = localStorage.getItem("kagaz_shop_data");

    if (rawShop) {
      try {
        setShopName(JSON.parse(rawShop).name);
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
          toast.error("Failed to load QR standee");
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
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">
            Counter Standee Studio
          </h1>
          <p className="text-xs text-neutral-500">
            Print this counter standee, laminate it, and place it at your front desk or counter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQrPng}
            className="text-xs font-semibold h-9"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download PNG
          </Button>

          <Button
            size="sm"
            onClick={handlePrintStandee}
            className="text-xs font-bold h-9 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Standee (A4 / A5)
          </Button>
        </div>
      </div>

      {/* Standee Card Preview (Styled for both Screen and Physical Paper Print) */}
      <div className="flex justify-center py-4">
        <div
          id="print-standee-card"
          className="w-full max-w-md bg-white text-neutral-950 p-8 sm:p-10 rounded-3xl border-2 border-neutral-900 shadow-xl text-center space-y-6 print:border-none print:shadow-none print:m-0 print:p-6"
        >
          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-900 text-[11px] font-bold tracking-wide">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Kagaz
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950 pt-1">
              {shopName}
            </h2>
            <p className="text-xs font-medium text-neutral-500">
              Fast, Private & Direct Printing
            </p>
          </div>

          {/* QR Code in Center */}
          <div className="p-4 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-300 inline-block mx-auto shadow-inner">
            {qrData?.dataUrl && (
              <img
                src={qrData.dataUrl}
                alt="Shop Standee QR Code"
                className="w-56 h-56 mx-auto object-contain"
              />
            )}
          </div>

          {/* 3 Step Instructions */}
          <div className="space-y-2.5 text-left bg-neutral-50/80 p-4 rounded-2xl border border-neutral-200">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-black text-xs">
                1
              </span>
              <span className="text-xs font-semibold text-neutral-800">
                Scan this QR code with your phone camera
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-black text-xs">
                2
              </span>
              <span className="text-xs font-semibold text-neutral-800">
                Upload your document & select options (B&W/Color)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white font-black text-xs">
                3
              </span>
              <span className="text-xs font-semibold text-neutral-800">
                Share your 4-digit pin at the counter to print
              </span>
            </div>
          </div>

          {/* Privacy Trust Seal */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            <span>100% private • No WhatsApp • Auto-deleted on print</span>
          </div>
        </div>
      </div>

      {/* Direct Link Share Card */}
      <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs print:hidden">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-neutral-900 dark:text-neutral-100">Direct Customer Link:</span>
            <p className="text-neutral-500 font-mono text-[11px] truncate max-w-sm">{qrData?.url}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="text-xs font-semibold h-8 shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

