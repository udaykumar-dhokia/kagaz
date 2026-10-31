"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, AlertCircle } from "lucide-react";
import { QuickPinBar } from "@/components/shop/quick-pin-bar";
import { QueueTable } from "@/components/shop/queue-table";
import { JobPrintModal } from "@/components/shop/job-print-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useShopSocket } from "@/hooks/use-socket";
import { useAudioChime } from "@/hooks/use-sound";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchShopBillingStatus } from "@/lib/api";
import {
  fetchQueue,
  searchQueuePin,
  completeJob,
  openJobModal,
  closeJobModal,
  onJobStatusUpdated,
  onJobCompleted,
  onJobCancelled,
} from "@/lib/store/slices/queueSlice";

export default function DashboardQueuePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const token = useAppSelector((state) => state.auth.token);
  const [isCounterExpired, setIsCounterExpired] = useState(false);
  const {
    jobs,
    selectedJob,
    isModalOpen,
    isLoading,
    isSearchingPin,
    isAudioMuted,
  } = useAppSelector((state) => state.queue);

  const { playChime } = useAudioChime();

  const loadQueue = useCallback(() => {
    if (token) {
      dispatch(fetchQueue(token));
      fetchShopBillingStatus(token)
        .then((res) => {
          if (res.success && res.data) {
            setIsCounterExpired(
              res.data.status === "EXPIRED" ||
                (!res.data.canAccessPlatform && !res.data.isTrialActive)
            );
          }
        })
        .catch(() => {});
    }
  }, [token, dispatch]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Real-time WebSocket connection
  const { isConnected } = useShopSocket(token, {
    onJobCreated: (data) => {
      if (!isAudioMuted) {
        playChime();
      }

      toast.info(`🔔 New print order: Pin ${data.pickupPin} (₹${data.totalAmount})`, {
        duration: 5000,
      });

      // Reload queue to fetch full line items
      loadQueue();
    },

    onJobStatusUpdated: (data) => {
      dispatch(onJobStatusUpdated(data));
    },

    onJobCompleted: (data) => {
      dispatch(onJobCompleted(data.jobId));
    },

    onJobCancelled: (data) => {
      dispatch(onJobCancelled(data.jobId));
    },
  });

  const handleSearchPin = async (pin: string) => {
    if (!token) return;
    const result = await dispatch(searchQueuePin({ token, pin }));
    if (searchQueuePin.rejected.match(result)) {
      toast.error(result.payload as string);
    }
  };

  const handleQuickComplete = async (jobId: string) => {
    if (!token) return;
    const result = await dispatch(
      completeJob({ token, jobId, paymentStatus: "PAID_CASH" })
    );
    if (completeJob.fulfilled.match(result)) {
      toast.success("Job marked done and document shredded.");
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <div className="space-y-5">
      {/* Inactive Counter Alert Banner */}
      {isCounterExpired && (
        <div className="p-4 sm:p-5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Counter Terminal Inactive
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Your 10-day free trial has expired. Customer uploads and printer dispatch are paused
                until you renew your subscription.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/subscription")}
              className="text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 h-8 px-3 rounded-lg"
            >
              Renew Subscription
            </Button>
          </div>
        </div>
      )}

      {/* Top Banner: Keyboard-First Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Counter Print Queue
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[11px] font-normal gap-1 px-2 py-0.5 rounded-md ${
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
              {isConnected ? "Live" : "Connecting..."}
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={loadQueue}
              className="h-8 w-8 rounded-lg text-neutral-500 hover:text-neutral-900"
              title="Refresh queue"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick PIN Input Bar */}
        <QuickPinBar onSearchPin={handleSearchPin} isLoading={isSearchingPin} />
      </div>

      {/* Queue Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
              Active Queue
            </h3>
            <Badge variant="secondary" className="text-xs px-2 py-0 rounded-md font-normal">
              {jobs.length} {jobs.length === 1 ? "order" : "orders"}
            </Badge>
          </div>
        </div>

        {isLoading && jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
            <p className="text-xs text-neutral-500">Loading counter queue...</p>
          </div>
        ) : (
          <QueueTable
            jobs={jobs}
            onSelectJob={(job) => dispatch(openJobModal(job))}
            onQuickComplete={handleQuickComplete}
          />
        )}
      </div>

      {/* Job Print Action Modal */}
      {token && (
        <JobPrintModal
          job={selectedJob}
          isOpen={isModalOpen}
          onClose={() => dispatch(closeJobModal())}
          onJobCompleted={(jobId) => dispatch(onJobCompleted(jobId))}
          token={token}
        />
      )}
    </div>
  );
}

