"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ShieldCheck, Zap, ArrowRight, Store, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const [shopCode, setShopCode] = useState("");
  const router = useRouter();

  const handleGoToShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopCode.trim()) return;
    router.push(`/s/${shopCode.trim().toLowerCase()}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Navigation Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold">
              <Printer className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">Kagaz</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium text-xs sm:text-sm">
                Shopkeeper Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-full px-4 text-xs sm:text-sm font-semibold">
                Register Shop
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center text-center">
        <Badge variant="secondary" className="mb-4 px-3 py-1 font-medium text-xs rounded-full">
          ⚡ No WhatsApp • Zero PC Downloads • 100% Private
        </Badge>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-2xl text-neutral-950 dark:text-neutral-50 leading-tight sm:leading-none">
          Direct Xerox & Print Shop Platform
        </h1>

        <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-xl">
          Scan the counter QR code, upload your documents to print, and tell your 4-digit PIN. 
          Files are permanently deleted immediately after printing.
        </p>

        {/* Enter Shop Code Form */}
        <Card className="mt-8 w-full max-w-md border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
          <form onSubmit={handleGoToShop} className="space-y-3">
            <label className="block text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Have a shop code or link?
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. sharma-xerox"
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value)}
                className="h-11 rounded-lg"
              />
              <Button type="submit" className="h-11 px-5 rounded-lg font-semibold shrink-0">
                Go to Shop <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-left text-neutral-400">
              Tip: In real shops, customers simply scan the QR standee at the counter.
            </p>
          </form>
        </Card>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 w-full text-left">
          <Card className="p-5 border-neutral-200/80 dark:border-neutral-800">
            <CardContent className="p-0 space-y-2">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">1. Scan & Upload</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                No app installation required. Customers open mobile web, choose B&W or Color, and view exact rates before uploading.
              </p>
            </CardContent>
          </Card>

          <Card className="p-5 border-neutral-200/80 dark:border-neutral-800">
            <CardContent className="p-0 space-y-2">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">2. 4-Digit Pickup PIN</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Customer shows a 4-digit PIN. Shopkeeper types it on the counter PC and prints with 1 click. Zero folder searching.
              </p>
            </CardContent>
          </Card>

          <Card className="p-5 border-neutral-200/80 dark:border-neutral-800">
            <CardContent className="p-0 space-y-2">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">3. Absolute Privacy</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                No stranger sees phone numbers. Files never accumulate in the Windows Downloads folder and are permanently shredded on print completion.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400">
        <p>© 2026 Kagaz Platform • Modern Print Shop Infrastructure</p>
      </footer>
    </div>
  );
}
