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
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchLedgerStats, toggleJobPayment } from "@/lib/store/slices/catalogSlice";

export default function DashboardLedgerPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const { ledgerData, historyJobs, isLoading } = useAppSelector(
    (state) => state.catalog
  );

  useEffect(() => {
    if (token) {
      dispatch(fetchLedgerStats(token));
    }
  }, [token, dispatch]);

  const loadData = (authToken: string) => {
    dispatch(fetchLedgerStats(authToken));
  };

  const handleTogglePayment = async (jobId: string, currentStatus: string) => {
    if (!token) return;
    const result = await dispatch(
      toggleJobPayment({ token, jobId, currentStatus })
    );
    if (toggleJobPayment.fulfilled.match(result)) {
      toast.success(
        `Payment updated to ${
          result.payload.newStatus === "PAID_CASH" ? "Cash" : "UPI"
        }`
      );
    } else {
      toast.error(result.payload as string);
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
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Daily Ledger & Reports
          </h1>
          <p className="text-xs text-neutral-500">
            Today's earnings and print volumes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => token && loadData(token)}
          className="text-xs h-8 px-3 rounded-lg font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-neutral-500">
              Today's Revenue
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{ledgerData?.totalRevenue.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">
              {ledgerData?.totalJobsCompleted || 0} completed
            </p>
          </CardContent>
        </Card>

        {/* Cash Collected */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Cash
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{ledgerData?.cashCollected.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Cash in drawer</p>
          </CardContent>
        </Card>

        {/* UPI Collected */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> UPI
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{ledgerData?.upiCollected.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Online settlement</p>
          </CardContent>
        </Card>

        {/* Total Pages Printed */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-neutral-500">
              Pages Printed
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {ledgerData?.totalPagesPrinted || 0}
            </div>
            <p className="text-[11px] text-neutral-400">
              {ledgerData?.bwPagesPrinted || 0} B&W • {ledgerData?.colorPagesPrinted || 0} Color
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completed Orders History Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
            Recent Completed Print Orders
          </h3>
          <span className="text-xs text-neutral-400">
            Last {historyJobs.length} orders
          </span>
        </div>

        {historyJobs.length === 0 ? (
          <Card className="p-8 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
            <p className="text-xs text-neutral-400">No completed orders recorded today yet.</p>
          </Card>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto shadow-2xs">
            <Table>
              <TableHeader className="bg-neutral-50/70 dark:bg-neutral-950/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-medium">PIN</TableHead>
                  <TableHead className="text-xs font-medium">Completed At</TableHead>
                  <TableHead className="text-xs font-medium">Customer</TableHead>
                  <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                  <TableHead className="w-[140px] text-xs font-medium text-right">Payment</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {historyJobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <TableCell className="font-mono font-medium text-sm">
                      {job.pickupPin}
                    </TableCell>

                    <TableCell className="text-xs text-neutral-500">
                      {new Date(job.completedAt || job.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    <TableCell className="text-xs text-neutral-500">
                      {job.customerPhoneMasked || "Walk-in"}
                    </TableCell>

                    <TableCell className="text-right font-medium text-sm text-neutral-900 dark:text-neutral-100">
                      ₹{job.totalAmount}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePayment(job.id, job.paymentStatus)}
                        className={`h-7 px-2.5 text-[11px] font-medium rounded-lg ${
                          job.paymentStatus === "PAID_UPI"
                            ? "border-blue-200 text-blue-700 bg-blue-50/40 dark:border-blue-800 dark:text-blue-300"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50/40 dark:border-emerald-800 dark:text-emerald-300"
                        }`}
                        title="Click to toggle Cash vs Upi"
                      >
                        {job.paymentStatus === "PAID_UPI" ? "Upi" : "Cash"}
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

