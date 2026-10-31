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
      toast.success(`Job Pin ${job.pickupPin} completed & shredded from cloud storage!`);
      onJobCompleted(job.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete job");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm(`Are you sure you want to cancel order Pin ${job.pickupPin}?`)) return;

    try {
      await cancelQueueJob(token, job.id);
      toast.info(`Order Pin ${job.pickupPin} cancelled`);
      onJobCompleted(job.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg p-5 sm:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 pb-1 pr-8 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 font-medium rounded-md">
              PIN: {job.pickupPin}
            </Badge>
            <Badge
              variant={job.status === "PRINTING" ? "default" : "secondary"}
              className="text-xs font-normal rounded-md"
            >
              {job.status === "PRINTING" ? "Printing" : "In Queue"}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 pt-1">
            Print Order Details
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            {job.customerPhoneMasked ? `Customer: ${job.customerPhoneMasked}` : "Walk-in Order"}
          </DialogDescription>
        </DialogHeader>

        {/* Specifications Cards */}
        <div className="space-y-3 py-1 min-w-0 w-full">
          {job.items.map((it, idx) => (
            <div
              key={it.id || idx}
              className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-2.5 min-w-0 w-full"
            >
              <div className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
                <FileText className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <span
                  className="font-medium text-xs text-neutral-900 dark:text-neutral-100 truncate min-w-0 flex-1 block"
                  title={it.originalFilename}
                >
                  {it.originalFilename}
                </span>
              </div>

              {/* Specs Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs min-w-0 w-full">
                <Badge variant="secondary" className="rounded-md font-normal text-[11px] text-neutral-700 dark:text-neutral-300 shrink-0">
                  {it.pageCount} {it.pageCount === 1 ? "page" : "pages"}
                  {it.pageRange !== "all" && ` (${it.pageRange})`}
                </Badge>

                <Badge
                  variant="outline"
                  className="rounded-md text-[11px] font-normal text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 shrink-0"
                >
                  <Palette className="h-3 w-3 mr-1 inline text-neutral-500" />
                  {it.colorMode === "COLOR" ? "Color" : "B&W"}
                </Badge>

                <Badge variant="outline" className="rounded-md font-normal text-[11px] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 shrink-0">
                  <Layers className="h-3 w-3 mr-1 inline text-neutral-500" />
                  {it.isDuplex ? "Double-Sided" : "Single-Sided"}
                </Badge>

                <Badge variant="outline" className="rounded-md font-normal text-[11px] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 shrink-0">
                  <Copy className="h-3 w-3 mr-1 inline text-neutral-500" />
                  {it.copies} {it.copies > 1 ? "Copies" : "Copy"}
                </Badge>

                <Badge variant="outline" className="rounded-md font-normal text-[11px] text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 shrink-0">
                  {it.paperSize}
                </Badge>
              </div>
            </div>
          ))}

          {/* Amount Banner */}
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-between min-w-0 w-full">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Total:
            </span>
            <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              ₹{job.totalAmount}
            </span>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5 min-w-0 w-full">
            <span className="text-neutral-500 font-normal">Payment:</span>
            <div className="flex gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant={paymentChoice === "PAID_CASH" ? "default" : "outline"}
                onClick={() => setPaymentChoice("PAID_CASH")}
                className="h-8 text-xs px-3 font-medium rounded-lg"
              >
                Cash
              </Button>
              <Button
                type="button"
                size="sm"
                variant={paymentChoice === "PAID_UPI" ? "default" : "outline"}
                onClick={() => setPaymentChoice("PAID_UPI")}
                className="h-8 text-xs px-3 font-medium rounded-lg"
              >
                UPI
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-neutral-200 dark:border-neutral-800 my-0.5" />

        {/* Action Buttons */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1 min-w-0 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelOrder}
            className="h-9 px-3 rounded-lg text-xs font-medium text-neutral-600 hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleTriggerBrowserPrint}
            disabled={isPrinting}
            className="h-9 px-4 rounded-lg text-xs font-semibold gap-1.5"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            {isPrinting ? "Printing..." : "Print"}
          </Button>

          <Button
            type="button"
            onClick={handleMarkCompleted}
            disabled={isCompleting}
            className="h-9 px-4 rounded-lg text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {isCompleting ? "Saving..." : "Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

