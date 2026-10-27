"use client";

import React, { useState, useEffect } from "react";
import {
  Printer,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  Copy,
  Palette,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { completeQueueJob, cancelQueueJob, API_BASE, type QueueJob } from "@/lib/api";

interface JobPrintModalProps {
  job: QueueJob | null;
  isOpen: boolean;
  onClose: () => void;
  onJobCompleted: (jobId: string) => void;
  token: string;
}

export function JobPrintModal({
  job,
  isOpen,
  onClose,
  onJobCompleted,
  token,
}: JobPrintModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<"PAID_CASH" | "PAID_UPI">("PAID_CASH");

  // Keyboard shortcut: Spacebar to trigger Print when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPrinting && !isCompleting) {
        // Prevent default spacebar scroll
        e.preventDefault();
        handleTriggerBrowserPrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, job, isPrinting, isCompleting]);

  if (!job) return null;

  const firstItem = job.items[0];

  // Zero-Disk In-Memory Browser Print
  const handleTriggerBrowserPrint = () => {
    setIsPrinting(true);

    const streamUrl = `${API_BASE}/shop/print/${job.id}/stream`;

    // Create a hidden iframe in memory to load the PDF stream and trigger window.print()
    let iframe = document.getElementById("kagaz-silent-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "kagaz-silent-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }

    // Attach auth token via fetch blob url to bypass authorization header limitation in iframe
    fetch(streamUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to stream document");
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        iframe.src = blobUrl;

        iframe.onload = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            // Fallback: open stream in temporary window
            window.open(blobUrl, "_blank");
          } finally {
            setIsPrinting(false);
          }
        };
      })
      .catch((err) => {
        console.error("Print stream error:", err);
        toast.error("Failed to load print stream. Opening direct viewer...");
        window.open(streamUrl, "_blank");
        setIsPrinting(false);
      });
  };

  const handleMarkCompleted = async () => {
    setIsCompleting(true);
    try {
      await completeQueueJob(token, job.id, paymentChoice);
      toast.success(`Job PIN ${job.pickupPin} completed & shredded from cloud storage!`);
      onJobCompleted(job.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete job");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm(`Are you sure you want to cancel order PIN ${job.pickupPin}?`)) return;

    try {
      await cancelQueueJob(token, job.id);
      toast.info(`Order PIN ${job.pickupPin} cancelled`);
      onJobCompleted(job.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6 border-neutral-200 dark:border-neutral-800">
        <DialogHeader className="space-y-1 pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="font-mono text-sm px-2.5 py-0.5 font-bold tracking-widest">
              PIN: {job.pickupPin}
            </Badge>
            <Badge
              variant={job.status === "PRINTING" ? "default" : "secondary"}
              className="text-xs"
            >
              {job.status === "PRINTING" ? "Printing Now" : "Waiting in Queue"}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-extrabold text-neutral-950 dark:text-neutral-50 pt-1">
            Print Order Details
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            {job.customerPhoneMasked
              ? `Customer: ${job.customerPhoneMasked}`
              : "Walk-in Guest Order (Anonymous)"}
          </DialogDescription>
        </DialogHeader>

        {/* Specifications Cards */}
        <div className="space-y-3 py-2">
          {job.items.map((it, idx) => (
            <div
              key={it.id || idx}
              className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2.5"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                  {it.originalFilename}
                </span>
              </div>

              {/* Specs Badges */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="secondary" className="font-medium text-[11px]">
                  {it.pageCount} {it.pageCount === 1 ? "Page" : "Pages"}
                  {it.pageRange !== "all" && ` (${it.pageRange})`}
                </Badge>

                <Badge
                  variant={it.colorMode === "COLOR" ? "default" : "outline"}
                  className={`text-[11px] ${
                    it.colorMode === "COLOR"
                      ? "bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                      : ""
                  }`}
                >
                  <Palette className="h-3 w-3 mr-1 inline" />
                  {it.colorMode === "COLOR" ? "Full Color" : "Black & White"}
                </Badge>

                <Badge variant="outline" className="text-[11px]">
                  <Layers className="h-3 w-3 mr-1 inline" />
                  {it.isDuplex ? "Double-sided (Duplex)" : "Single-sided"}
                </Badge>

                <Badge variant="outline" className="text-[11px]">
                  <Copy className="h-3 w-3 mr-1 inline" />
                  {it.copies} {it.copies > 1 ? "Copies" : "Copy"}
                </Badge>

                <Badge variant="outline" className="text-[11px] uppercase">
                  {it.paperSize}
                </Badge>
              </div>
            </div>
          ))}

          {/* Amount to Collect Banner */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              Total to Collect:
            </span>
            <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100">
              ₹{job.totalAmount}
            </span>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-neutral-500 font-medium">Mark Paid as:</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={paymentChoice === "PAID_CASH" ? "default" : "outline"}
                onClick={() => setPaymentChoice("PAID_CASH")}
                className="h-7 text-xs px-2.5 font-semibold"
              >
                Cash Collected
              </Button>
              <Button
                type="button"
                size="sm"
                variant={paymentChoice === "PAID_UPI" ? "default" : "outline"}
                onClick={() => setPaymentChoice("PAID_UPI")}
                className="h-7 text-xs px-2.5 font-semibold"
              >
                UPI QR Paid
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-neutral-200 dark:bg-neutral-800 my-1" />

        {/* Action Buttons */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelOrder}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 order-3 sm:order-1"
          >
            Cancel Order
          </Button>

          <Button
            type="button"
            onClick={handleTriggerBrowserPrint}
            disabled={isPrinting}
            className="h-11 px-5 rounded-xl text-xs font-bold flex-1 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm order-1 sm:order-2"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            {isPrinting ? "Spooling PDF..." : "Print Stream (Spacebar)"}
          </Button>

          <Button
            type="button"
            onClick={handleMarkCompleted}
            disabled={isCompleting}
            className="h-11 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm order-2 sm:order-3"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {isCompleting ? "Shredding..." : "Done & Shred"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

