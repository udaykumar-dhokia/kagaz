"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  IndianRupee,
  CheckCircle2,
  Clock,
  Layers,
  Palette,
  FileText,
  Calendar,
  CreditCard,
  Banknote,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  fetchDailyLedger,
  fetchLedgerHistory,
  updateLedgerPayment,
  type DailyLedgerResponse,
  type LedgerHistoryResponse,
} from "@/lib/api";

export default function DashboardLedgerPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<DailyLedgerResponse["data"]["summary"] | null>(null);
  const [historyJobs, setHistoryJobs] = useState<LedgerHistoryResponse["data"]["jobs"]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("kagaz_shop_token");
    setToken(storedToken);

    if (storedToken) {
      loadData(storedToken);
    }
  }, []);

  const loadData = async (authToken: string) => {
    setIsLoading(true);
    try {
      const [dailyRes, historyRes] = await Promise.all([
        fetchDailyLedger(authToken),
        fetchLedgerHistory(authToken, 50, 0),
      ]);

      setLedgerData(dailyRes.data.summary);
      setHistoryJobs(historyRes.data.jobs);
    } catch (err: any) {
      console.error("Ledger fetch error:", err);
      toast.error("Failed to load ledger data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePayment = async (jobId: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === "PAID_CASH" ? "PAID_UPI" : "PAID_CASH";

    try {
      await updateLedgerPayment(token, jobId, newStatus);
      setHistoryJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, paymentStatus: newStatus } : j))
      );
      toast.success(`Payment updated to ${newStatus === "PAID_CASH" ? "Cash" : "UPI"}`);
      // Refresh daily metrics
      const dailyRes = await fetchDailyLedger(token);
      setLedgerData(dailyRes.data.summary);
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
        <p className="text-xs text-neutral-500">Loading daily ledger & analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">
            Daily Ledger & Reports
          </h1>
          <p className="text-xs text-neutral-500">
            Track today's counter earnings, cash vs. UPI collection, and printed volumes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => token && loadData(token)}
          className="text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-4">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-500 tracking-wider">
              Today's revenue
            </span>
            <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-neutral-50">
              ₹{ledgerData?.totalRevenue.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">
              {ledgerData?.totalJobsCompleted || 0} prints completed
            </p>
          </CardContent>
        </Card>

        {/* Cash Collected */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-4">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-600 tracking-wider flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Cash collected
            </span>
            <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-neutral-50">
              ₹{ledgerData?.cashCollected.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Cash in drawer</p>
          </CardContent>
        </Card>

        {/* UPI Collected */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-4">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-semibold text-blue-600 tracking-wider flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Upi payments
            </span>
            <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-neutral-50">
              ₹{ledgerData?.upiCollected.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Online bank settlement</p>
          </CardContent>
        </Card>

        {/* Total Pages Printed */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs p-4">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-semibold text-neutral-500 tracking-wider">
              Pages printed
            </span>
            <div className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-neutral-50">
              {ledgerData?.totalPagesPrinted || 0}
            </div>
            <p className="text-[11px] text-neutral-400">
              {ledgerData?.bwPagesPrinted || 0} B&w • {ledgerData?.colorPagesPrinted || 0} Color
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completed Orders History Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
            Recent Completed Print Orders
          </h3>
          <span className="text-xs text-neutral-400">
            Showing last {historyJobs.length} completed prints
          </span>
        </div>

        {historyJobs.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-400">No completed orders recorded today yet.</p>
          </Card>
        ) : (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-neutral-50/70 dark:bg-neutral-950/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-semibold">Pin</TableHead>
                  <TableHead className="text-xs font-semibold">Completed at</TableHead>
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold text-right">Payment status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {historyJobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <TableCell className="font-mono font-bold text-sm">
                      {job.pickupPin}
                    </TableCell>

                    <TableCell className="text-xs text-neutral-500">
                      {new Date(job.completedAt || job.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                      {job.customerPhoneMasked || "Walk-in Guest"}
                    </TableCell>

                    <TableCell className="text-right font-extrabold text-sm text-neutral-900 dark:text-neutral-100">
                      ₹{job.totalAmount}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePayment(job.id, job.paymentStatus)}
                        className={`h-7 px-2.5 text-[11px] font-bold rounded-lg ${
                          job.paymentStatus === "PAID_UPI"
                            ? "border-blue-200 text-blue-700 bg-blue-50/40 dark:border-blue-800 dark:text-blue-300"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50/40 dark:border-emerald-800 dark:text-emerald-300"
                        }`}
                        title="Click to toggle Cash vs UPI"
                      >
                        {job.paymentStatus === "PAID_UPI" ? "UPI Paid" : "Cash Paid"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

