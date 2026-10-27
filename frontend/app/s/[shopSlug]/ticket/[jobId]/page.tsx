"use client";

import React, { useEffect, useState, use, Suspense, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { fetchJobStatus, type JobStatusResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

function TicketContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ shopSlug: string; jobId: string }>;
}) {
  const { shopSlug, jobId } = use(paramsPromise);

  const [job, setJob] = useState<JobStatusResponse["data"] | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetchJobStatus(jobId);
        if (isMounted) {
          setJob(res.data);
          setIsLoading(false);

          // If status completed and confetti not yet fired
          if (res.data.status === "COMPLETED" && !hasTriggeredConfetti.current) {
            hasTriggeredConfetti.current = true;
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds while not completed or expired
    const interval = setInterval(() => {
      if (job?.status !== "COMPLETED" && job?.status !== "EXPIRED") {
        checkStatus();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, job?.status]);

  const handleCopyPin = () => {
    if (!job?.pickupPin) return;
    navigator.clipboard.writeText(job.pickupPin);
    setCopied(true);
    toast.success("PIN copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !job) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-10 w-10 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm text-neutral-500 font-medium">Generating your pickup ticket...</p>
      </div>
    );
  }

  const isCompleted = job.status === "COMPLETED";
  const isPrinting = job.status === "PRINTING";
  const isQueued = job.status === "QUEUED";

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Top Notice */}
      <div className="text-center space-y-1">
        <Badge
          variant="secondary"
          className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        >
          <Sparkles className="h-3 w-3 mr-1 inline" />
          Order Registered
        </Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-neutral-50 pt-1">
          Counter Pickup Ticket
        </h1>
        <p className="text-xs text-neutral-500">
          Share this PIN at the counter to start printing.
        </p>
      </div>

      {/* The Giant PIN Card */}
      <Card className="border-2 border-neutral-900 dark:border-neutral-100 shadow-md bg-white dark:bg-neutral-900 overflow-hidden text-center">
        <div className="bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 py-2.5 px-4 text-xs font-bold tracking-widest uppercase">
          Pickup PIN
        </div>

        <CardContent className="p-6 sm:p-8 space-y-4">
          {/* Giant PIN display */}
          <div
            onClick={handleCopyPin}
            className="cursor-pointer group flex items-center justify-center gap-3 select-all py-2"
          >
            <span className="font-mono text-5xl sm:text-6xl font-black tracking-widest text-neutral-950 dark:text-neutral-50 group-hover:scale-105 transition-transform">
              {job.pickupPin}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0 border-neutral-300 dark:border-neutral-700"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tell this 4-digit code to the shopkeeper at the counter.
          </p>

          <Separator className="bg-neutral-200 dark:bg-neutral-800" />

          {/* Amount to pay */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-neutral-500">Amount to pay at counter:</span>
            <span className="text-xl font-extrabold text-neutral-950 dark:text-neutral-50">
              ₹{job.totalAmount}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Live Order Status Stepper */}
      <Card className="border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Live Print Status
          </span>
          {isCompleted ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs">
              Printed & Done
            </Badge>
          ) : isPrinting ? (
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-xs animate-pulse">
              Printing Now...
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Waiting in Queue
            </Badge>
          )}
        </div>

        {/* 3 Step Visual Progress */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
          <div
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${
              isQueued || isPrinting || isCompleted
                ? "border-emerald-500/30 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 font-semibold"
                : "border-neutral-200 text-neutral-400"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>1. In Queue</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${
              isPrinting || isCompleted
                ? "border-blue-500/30 bg-blue-50/50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300 font-semibold"
                : "border-neutral-200 text-neutral-400"
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>2. Printing</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-colors ${
              isCompleted
                ? "border-emerald-500/40 bg-emerald-100/60 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold"
                : "border-neutral-200 text-neutral-400"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>3. Completed</span>
          </div>
        </div>

        {/* Completion Message */}
        {isCompleted && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1 animate-in fade-in">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Your print is ready!
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Collect your pages from the counter. Your digital document has been permanently deleted from storage.
            </p>
          </div>
        )}
      </Card>

      {/* Print Another Button */}
      <Link href={`/s/${shopSlug}`} className="block">
        <Button variant="outline" className="w-full h-11 rounded-xl text-xs font-semibold">
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Print Another Document
        </Button>
      </Link>

      {/* Privacy Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 pt-2 text-center">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>Files automatically deleted within 60 minutes or upon completion.</span>
      </div>
    </div>
  );
}

export default function CustomerTicketPage({
  params,
}: {
  params: Promise<{ shopSlug: string; jobId: string }>;
}) {
  return (
    <main className="min-h-screen bg-neutral-50/40 dark:bg-neutral-950 flex flex-col items-center py-8 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-10 w-10 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-500 font-medium">Loading ticket...</p>
          </div>
        }
      >
        <TicketContent paramsPromise={params} />
      </Suspense>
    </main>
  );
}

