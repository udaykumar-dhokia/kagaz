"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Printer,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  Inbox,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { QuickPinBar } from "@/components/shop/quick-pin-bar";
import { QueueTable } from "@/components/shop/queue-table";
import { JobPrintModal } from "@/components/shop/job-print-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchShopQueue, verifyQueuePin, completeQueueJob, type QueueJob } from "@/lib/api";
import { useShopSocket } from "@/hooks/use-socket";
import { useAudioChime } from "@/hooks/use-sound";

export default function DashboardQueuePage() {
  const [token, setToken] = useState<string | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<QueueJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchingPin, setIsSearchingPin] = useState(false);

  const { playChime } = useAudioChime();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("kagaz_shop_token");
      setToken(storedToken);
    }
  }, []);

  // Fetch current queue
  const loadQueue = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchShopQueue(token);
      setJobs(res.data);
    } catch (err: any) {
      console.warn("Queue fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadQueue();
    }
  }, [token, loadQueue]);

  // Real-time WebSocket connection
  const { isConnected } = useShopSocket(token, {
    onJobCreated: (data) => {
      // Play audio chime
      playChime();

      toast.info(`🔔 New Print Order: PIN ${data.pickupPin} (₹${data.totalAmount})`, {
        duration: 5000,
      });

      // Reload queue to fetch full line items
      loadQueue();
    },

    onJobStatusUpdated: (data) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === data.jobId ? { ...j, status: data.status } : j))
      );
    },

    onJobCompleted: (data) => {
      setJobs((prev) => prev.filter((j) => j.id !== data.jobId));
    },

    onJobCancelled: (data) => {
      setJobs((prev) => prev.filter((j) => j.id !== data.jobId));
    },
  });

  // Fast keyboard PIN search
  const handleSearchPin = async (pin: string) => {
    if (!token) return;
    setIsSearchingPin(true);

    try {
      const res = await verifyQueuePin(token, pin);
      const verifiedJob: QueueJob = {
        ...res.data.job,
        items: res.data.items,
      };

      setSelectedJob(verifiedJob);
      setIsModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || `No active job found for PIN "${pin}"`);
    } finally {
      setIsSearchingPin(false);
    }
  };

  const handleQuickComplete = async (jobId: string) => {
    if (!token) return;
    try {
      await completeQueueJob(token, jobId, "PAID_CASH");
      toast.success("Job marked done and document shredded.");
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: any) {
      toast.error(err.message || "Failed to complete job");
    }
  };

  const handleJobCompleted = (jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Keyboard-First Search Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">
              Counter Print Queue
            </h1>
            <p className="text-xs text-neutral-500">
              Type the customer's 4-digit PIN to print instantly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[11px] gap-1 px-2.5 py-0.5 ${
                isConnected
                  ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                  : "border-neutral-300 text-neutral-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                }`}
              />
              {isConnected ? "Live Sync Active" : "Connecting..."}
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={loadQueue}
              className="h-8 w-8 text-neutral-500 hover:text-neutral-900"
              title="Refresh queue"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quick PIN Input Bar */}
        <QuickPinBar onSearchPin={handleSearchPin} isLoading={isSearchingPin} />
      </div>

      {/* Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              Active Queue
            </h3>
            <Badge variant="secondary" className="text-xs px-2 py-0">
              {jobs.length} {jobs.length === 1 ? "Order" : "Orders"}
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
            <p className="text-xs text-neutral-500">Loading counter queue...</p>
          </div>
        ) : (
          <QueueTable
            jobs={jobs}
            onSelectJob={(job) => {
              setSelectedJob(job);
              setIsModalOpen(true);
            }}
            onQuickComplete={handleQuickComplete}
          />
        )}
      </div>

      {/* Job Print Action Modal */}
      {token && (
        <JobPrintModal
          job={selectedJob}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onJobCompleted={handleJobCompleted}
          token={token}
        />
      )}
    </div>
  );
}

