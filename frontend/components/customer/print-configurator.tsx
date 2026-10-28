"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Copy,
  Layers,
  Palette,
  CheckCircle2,
  AlertCircle,
  Phone,
  ShieldCheck,
  ArrowRight,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { submitPrintOrder, type CreateOrderResponse, type ShopCatalogResponse } from "@/lib/api";
import type { UploadedDocument } from "./file-dropzone";

interface PrintConfiguratorProps {
  shopSlug: string;
  doc: UploadedDocument;
  catalog: ShopCatalogResponse["data"]["catalog"];
  onOrderCreated: (orderData: CreateOrderResponse["data"]) => void;
}

export function PrintConfigurator({ shopSlug, doc, catalog, onOrderCreated }: PrintConfiguratorProps) {
  // State for print specifications
  const [colorMode, setColorMode] = useState<"BW" | "COLOR">("BW");
  const [isDuplex, setIsDuplex] = useState<boolean>(catalog.isDuplexEnabled);
  const [copies, setCopies] = useState<number>(1);
  const [pageSelection, setPageSelection] = useState<"all" | "custom">("all");
  const [customRange, setCustomRange] = useState<string>("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse custom page ranges (e.g. "1-5, 8, 12")
  const parsedEffectivePages = useMemo(() => {
    if (pageSelection === "all" || !customRange.trim()) {
      return doc.pageCount;
    }

    try {
      const selected = new Set<number>();
      const parts = customRange.split(",");

      for (const part of parts) {
        const seg = part.trim();
        if (!seg) continue;

        if (seg.includes("-")) {
          const [startStr, endStr] = seg.split("-");
          const start = parseInt(startStr || "0", 10);
          const end = parseInt(endStr || "0", 10);
          if (isNaN(start) || isNaN(end) || start > end || start < 1) return null;
          for (let p = start; p <= Math.min(end, doc.pageCount); p++) {
            selected.add(p);
          }
        } else {
          const p = parseInt(seg, 10);
          if (isNaN(p) || p < 1 || p > doc.pageCount) return null;
          selected.add(p);
        }
      }

      return selected.size > 0 ? selected.size : null;
    } catch {
      return null;
    }
  }, [pageSelection, customRange, doc.pageCount]);

  // Live bill calculation
  const quote = useMemo(() => {
    const pages = parsedEffectivePages !== null ? parsedEffectivePages : doc.pageCount;

    // Rate selection
    let rate = 0;
    if (colorMode === "COLOR") {
      rate = isDuplex ? Number(catalog.colorDoublePrice) : Number(catalog.colorSinglePrice);
    } else {
      rate = isDuplex ? Number(catalog.bwDoublePrice) : Number(catalog.bwSinglePrice);
    }

    const printSubtotal = Number((rate * pages * copies).toFixed(2));

    const addonsSubtotal = selectedAddonIds.reduce((sum, id) => {
      const addon = catalog.addons.find((a) => a.id === id);
      return sum + (addon ? Number(addon.price) : 0);
    }, 0);

    const total = Number((printSubtotal + addonsSubtotal).toFixed(2));

    return {
      ratePerUnit: rate,
      pages,
      printSubtotal,
      addonsSubtotal: Number(addonsSubtotal.toFixed(2)),
      total,
    };
  }, [colorMode, isDuplex, copies, parsedEffectivePages, doc.pageCount, catalog, selectedAddonIds]);

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSubmit = async () => {
    if (pageSelection === "custom" && parsedEffectivePages === null) {
      toast.error("Please enter a valid page range (e.g. 1-5, 8)");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        shopSlug,
        customerPhone: customerPhone.trim() || undefined,
        items: [
          {
            fileKey: doc.fileKey,
            originalFilename: doc.filename,
            fileSize: doc.sizeBytes,
            pageCount: doc.pageCount,
            pageRange: pageSelection === "custom" ? customRange.trim() : "all",
            copies,
            colorMode,
            paperSize: doc.paperSize,
            isDuplex,
          },
        ],
        selectedAddonIds,
      };

      const res = await submitPrintOrder(payload);

      // Persist active job to localStorage so user never loses PIN on refresh or tab close
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `kagaz_active_job_${shopSlug}`,
          JSON.stringify({
            jobId: res.data.jobId,
            pickupPin: res.data.pickupPin,
            totalAmount: res.data.totalAmount,
            createdAt: Date.now(),
          })
        );
        localStorage.removeItem(`kagaz_pending_doc_${shopSlug}`);
      }

      toast.success("Print job created! Showing your 4-digit pin.");
      onOrderCreated(res.data);
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* File Summary Card */}
      <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <FileText className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                {doc.filename}
              </p>
              <p className="text-xs text-neutral-500">
                {doc.pageCount} total pages • {doc.paperSize}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            Ready
          </Badge>
        </CardContent>
      </Card>

      {/* Print Options */}
      <div className="space-y-4">
        {/* 1. Color Mode */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-neutral-500" />
                Color Mode
              </Label>
              {!catalog.isColorEnabled && (
                <Badge variant="outline" className="text-[10px] text-neutral-400">
                  Shop is B&W only
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setColorMode("BW")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  colorMode === "BW"
                    ? "border-primary bg-primary/5 font-semibold text-neutral-900 dark:text-neutral-50 shadow-2xs"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
              >
                <span className="text-sm">Black & White</span>
                <span className="text-xs text-neutral-500 mt-0.5">₹{catalog.bwSinglePrice}/pg</span>
              </button>

              <button
                type="button"
                disabled={!catalog.isColorEnabled}
                onClick={() => setColorMode("COLOR")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  colorMode === "COLOR"
                    ? "border-amber-500 bg-amber-500/10 font-semibold text-amber-900 dark:text-amber-100 shadow-2xs"
                    : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                <span className="text-sm">Full Color</span>
                <span className="text-xs text-neutral-500 mt-0.5">
                  {catalog.isColorEnabled ? `₹${catalog.colorSinglePrice}/pg` : "Not available"}
                </span>
              </button>
            </div>
          </div>
        </Card>

        {/* 2. Sides (Single vs. Duplex) */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-neutral-500" />
                Print Both Sides (Duplex)
              </Label>
              <p className="text-xs text-neutral-500">
                {catalog.isDuplexEnabled
                  ? `Saves paper • ₹${
                      colorMode === "COLOR" ? catalog.colorDoublePrice : catalog.bwDoublePrice
                    }/side`
                  : "Double-sided not supported by this shop"}
              </p>
            </div>

            <Switch
              disabled={!catalog.isDuplexEnabled}
              checked={isDuplex}
              onCheckedChange={setIsDuplex}
            />
          </div>
        </Card>

        {/* 3. Copies Counter */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Copy className="h-4 w-4 text-neutral-500" />
              Number of Copies
            </Label>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={copies <= 1}
                onClick={() => setCopies((c) => Math.max(1, c - 1))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="font-bold text-base w-8 text-center">{copies}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={copies >= 50}
                onClick={() => setCopies((c) => Math.min(50, c + 1))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* 4. Page Range Selection */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-3">
          <Label className="text-sm font-semibold">Pages to Print</Label>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={pageSelection === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setPageSelection("all")}
              className="text-xs font-medium"
            >
              All Pages ({doc.pageCount})
            </Button>
            <Button
              type="button"
              variant={pageSelection === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setPageSelection("custom")}
              className="text-xs font-medium"
            >
              Custom Range
            </Button>
          </div>

          {pageSelection === "custom" && (
            <div className="space-y-1.5 pt-1">
              <Input
                placeholder="e.g. 1-5, 8, 12"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-neutral-500">
                {parsedEffectivePages !== null ? (
                  <span className="text-emerald-600 font-medium">
                    ✓ {parsedEffectivePages} pages selected
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    ⚠️ Enter valid range like "1-3, 5" (within 1 to {doc.pageCount})
                  </span>
                )}
              </p>
            </div>
          )}
        </Card>

        {/* 5. Add-on Services (Optional) */}
        {catalog.addons.length > 0 && (
          <Card className="border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-3">
            <Label className="text-sm font-semibold">Additional Services (Add-ons)</Label>

            <div className="space-y-2">
              {catalog.addons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 border border-neutral-100 dark:border-neutral-800/60"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={addon.id}
                      checked={selectedAddonIds.includes(addon.id)}
                      onCheckedChange={() => handleToggleAddon(addon.id)}
                    />
                    <label
                      htmlFor={addon.id}
                      className="text-xs font-medium leading-none cursor-pointer text-neutral-800 dark:text-neutral-200"
                    >
                      {addon.name}
                    </label>
                  </div>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    +₹{addon.price}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 6. Optional Phone for Notifications */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
            <Phone className="h-3.5 w-3.5" />
            Phone Number (Optional)
          </Label>
          <Input
            placeholder="For WhatsApp / SMS pickup alert"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="h-9 text-xs"
          />
          <p className="text-[11px] text-neutral-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Your number is never shown to other customers and is masked for the shopkeeper.
          </p>
        </Card>
      </div>

      {/* Bill & Submission Card */}
      <Card className="border-2 border-primary/20 bg-neutral-50/50 dark:bg-neutral-950 p-4 space-y-3 shadow-sm">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
            <span>
              Print Cost ({quote.pages} pages × ₹{quote.ratePerUnit.toFixed(2)} × {copies} {copies > 1 ? "copies" : "copy"}):
            </span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{quote.printSubtotal.toFixed(2)}
            </span>
          </div>

          {quote.addonsSubtotal > 0 && (
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Add-on Services:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                ₹{quote.addonsSubtotal.toFixed(2)}
              </span>
            </div>
          )}

          <Separator className="my-1.5 bg-neutral-200 dark:bg-neutral-800" />

          <div className="flex justify-between items-baseline text-sm">
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Total:</span>
            <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              ₹{quote.total.toFixed(2)}
            </span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || (pageSelection === "custom" && parsedEffectivePages === null)}
          className="w-full h-10 rounded-lg text-sm font-medium shadow-2xs flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>Generating pin...</span>
          ) : (
            <>
              <span>Get 4-digit pickup pin</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}

