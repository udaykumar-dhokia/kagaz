"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ShieldCheck, Zap, ArrowRight, Store, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KagazLogo } from "@/components/ui/logo";

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
            <KagazLogo className="h-8 w-auto" />
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium text-xs h-9 rounded-lg">
                Shopkeeper Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-lg h-9 px-3.5 text-xs font-medium shadow-2xs">
                Register Shop
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center text-center">
        <Badge variant="secondary" className="mb-4 px-2.5 py-0.5 font-normal text-xs rounded-md">
          No WhatsApp • Zero Downloads • 100% Private
        </Badge>

        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight max-w-2xl text-neutral-900 dark:text-neutral-50 leading-tight sm:leading-none">
          Direct Xerox & Print Shop Platform
        </h1>

        <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-xl">
          Scan the counter QR code, upload documents to print, and tell your 4-digit PIN. 
          Files are permanently shredded immediately after printing.
        </p>

        {/* Enter Shop Code Form */}
        <Card className="mt-8 w-full max-w-md border border-neutral-200 dark:border-neutral-800 shadow-2xs p-4 rounded-xl">
          <form onSubmit={handleGoToShop} className="space-y-3">
            <label className="block text-left text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Have a Shop Code or Link?
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. sharma-xerox"
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
              <Button type="submit" className="h-9 px-4 rounded-lg text-xs font-medium shrink-0 shadow-2xs">
                Go to Shop <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-left text-neutral-400">
              Tip: In real shops, customers simply scan the counter standee QR code.
            </p>
          </form>
        </Card>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14 w-full text-left">
          <Card className="p-4 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-2xs">
            <CardContent className="p-0 space-y-2">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <QrCode className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">1. Scan & Upload</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                No app installation required. Customers open mobile web, choose B&W or color, and view exact rates before uploading.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-2xs">
            <CardContent className="p-0 space-y-2">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">2. 4-Digit Pickup PIN</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Customer shows a 4-digit PIN. Shopkeeper types it on the counter PC and prints with 1 click. Zero folder searching.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-2xs">
            <CardContent className="p-0 space-y-2">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">3. Absolute Privacy</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                No stranger sees phone numbers. Files never accumulate in downloads folder and are permanently shredded on print completion.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-400">
        <p>© 2026 Kagaz • Modern print shop infrastructure</p>
      </footer>
    </div>
  );
}
