"use client";

import React, { useEffect, useCallback, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Inbox,
  AlertCircle,
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
import {
  fetchLedgerAnalyticsThunk,
  fetchLedgerHistoryThunk,
  toggleJobPaymentThunk,
  setRange,
  setCustomDates,
  setPaymentStatus,
  setSearchQuery,
  setPage,
  type LedgerRange,
  type PaymentFilter,
} from "@/lib/store/slices/ledgerSlice";
import {
  RevenueTimelineChart,
  PaymentSplitDonut,
  PrintVolumeBreakdownBar,
} from "@/components/dashboard/ledger-charts";
import { LedgerFilterBar } from "@/components/dashboard/ledger-filter-bar";

export default function DashboardLedgerPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const shopName = useAppSelector((state) => state.auth.shop?.name || "Kagaz Counter");

  const {
    filters,
    analytics,
    historyJobs,
    totalHistoryCount,
    isLoadingAnalytics,
    isLoadingHistory,
    isUpdatingPayment,
  } = useAppSelector((state) => state.ledger);

  // Load both Analytics and History
  const reloadData = useCallback(() => {
    if (token) {
      dispatch(fetchLedgerAnalyticsThunk({ token }));
      dispatch(fetchLedgerHistoryThunk({ token }));
    }
  }, [token, dispatch]);

  useEffect(() => {
    reloadData();
  }, [
    token,
    filters.range,
    filters.startDate,
    filters.endDate,
    filters.paymentStatus,
    filters.searchQuery,
    filters.page,
    filters.sortBy,
    reloadData,
  ]);

  // Handlers for Filters
  const handleRangeChange = (newRange: LedgerRange) => {
    dispatch(setRange(newRange));
  };

  const handleCustomDatesChange = (startDate: string, endDate: string) => {
    dispatch(setCustomDates({ startDate, endDate }));
  };

  const handlePaymentFilterChange = (status: PaymentFilter) => {
    dispatch(setPaymentStatus(status));
  };

  const handleSearchChange = (query: string) => {
    dispatch(setSearchQuery(query));
  };

  const handleTogglePayment = async (jobId: string, currentStatus: string) => {
    if (!token) return;
    const result = await dispatch(
      toggleJobPaymentThunk({ token, jobId, currentStatus })
    );
    if (toggleJobPaymentThunk.fulfilled.match(result)) {
      toast.success(
        `Payment updated to ${
          result.payload.newStatus === "PAID_CASH" ? "Cash" : "UPI"
        }`
      );
    } else {
      toast.error(result.payload as string);
    }
  };

  // CSV Export Function
  const handleExportCsv = () => {
    if (historyJobs.length === 0) {
      toast.error("No completed orders to export for the selected filter.");
      return;
    }

    const headers = [
      "PIN",
      "Date",
      "Time",
      "Document Filename",
      "Pages",
      "Color Mode",
      "Duplex",
      "Copies",
      "Amount (INR)",
      "Payment Method",
      "Customer Phone",
    ];

    const rows = historyJobs.map((job) => {
      const dateObj = new Date(job.completedAt || job.createdAt);
      const dateStr = dateObj.toLocaleDateString("en-IN");
      const timeStr = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const item = job.items[0];

      return [
        job.pickupPin,
        dateStr,
        timeStr,
        `"${(item?.originalFilename || "Document").replace(/"/g, '""')}"`,
        item?.pageCount || 1,
        item?.colorMode || "BW",
        item?.isDuplex ? "Yes" : "No",
        item?.copies || 1,
        job.totalAmount,
        job.paymentStatus === "PAID_CASH" ? "Cash" : job.paymentStatus === "PAID_UPI" ? "UPI" : "Unpaid",
        job.customerPhoneMasked || "Walk-in",
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kagaz-ledger-${filters.range}-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded successfully!");
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Human-readable active range label
  const rangeLabel = useMemo(() => {
    switch (filters.range) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "7d":
        return "Last 7 Days";
      case "30d":
        return "This Month";
      case "custom":
        return filters.startDate && filters.endDate
          ? `${filters.startDate} to ${filters.endDate}`
          : "Custom Period";
      default:
        return "Selected Period";
    }
  }, [filters.range, filters.startDate, filters.endDate]);

  const summary = analytics?.summary;
  const breakdown = analytics?.breakdown;
  const timeline = analytics?.timeline || [];

  const totalPages = Math.ceil(totalHistoryCount / filters.limit) || 1;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Daily Ledger & Reports
            </h1>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md font-normal">
              {rangeLabel}
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time counter reconciliation, cash drawer audit, and volume analysis.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={reloadData}
          className="text-xs h-8 px-3 rounded-lg font-medium self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoadingAnalytics ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Printable Heading (Only visible when physical printing) */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">{shopName}</h1>
        <p className="text-sm text-neutral-600">Counter Closing Report • {rangeLabel}</p>
        <p className="text-xs text-neutral-400 mt-1">Generated via Kagaz Print Infrastructure</p>
      </div>

      {/* Advanced Filter Bar */}
      <LedgerFilterBar
        range={filters.range}
        startDate={filters.startDate}
        endDate={filters.endDate}
        paymentStatus={filters.paymentStatus}
        searchQuery={filters.searchQuery}
        onRangeChange={handleRangeChange}
        onCustomDatesChange={handleCustomDatesChange}
        onPaymentStatusChange={handlePaymentFilterChange}
        onSearchChange={handleSearchChange}
        onExportCsv={handleExportCsv}
        onPrintReport={handlePrintReport}
        totalFilteredCount={totalHistoryCount}
      />

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Revenue */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-neutral-500">
              Total Revenue
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{summary?.totalRevenue.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">
              {summary?.totalJobsCompleted || 0} completed orders
            </p>
          </CardContent>
        </Card>

        {/* Cash in Drawer */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Cash in Drawer
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{summary?.cashCollected.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Physical drawer cash</p>
          </CardContent>
        </Card>

        {/* UPI Collected */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> UPI Settlement
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{summary?.upiCollected.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Online bank settlement</p>
          </CardContent>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-neutral-500">
              Average Order Value
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              ₹{summary?.averageOrderValue.toFixed(2) || "0.00"}
            </div>
            <p className="text-[11px] text-neutral-400">Avg per counter customer</p>
          </CardContent>
        </Card>

        {/* Total Pages Printed */}
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs p-3.5 rounded-xl col-span-2 sm:col-span-1">
          <CardContent className="p-0 space-y-1">
            <span className="text-[11px] font-medium text-neutral-500">
              Total Volume
            </span>
            <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {summary?.totalPagesPrinted || 0}
            </div>
            <p className="text-[11px] text-neutral-400">
              {summary?.bwPagesPrinted || 0} B&W • {summary?.colorPagesPrinted || 0} Color
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Analysis Hub */}
      <div className="space-y-4 print:hidden">
        <RevenueTimelineChart
          timeline={timeline}
          isSingleDay={analytics?.isSingleDay ?? true}
          rangeLabel={rangeLabel}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PaymentSplitDonut
            cashCollected={summary?.cashCollected || 0}
            upiCollected={summary?.upiCollected || 0}
            unpaidAmount={summary?.unpaidAmount || 0}
            totalRevenue={summary?.totalRevenue || 0}
            cashPercentage={breakdown?.cashPercentage || 0}
            upiPercentage={breakdown?.upiPercentage || 0}
          />

          <PrintVolumeBreakdownBar
            totalPages={summary?.totalPagesPrinted || 0}
            bwPages={summary?.bwPagesPrinted || 0}
            colorPages={summary?.colorPagesPrinted || 0}
            duplexSheets={summary?.duplexSheetsPrinted || 0}
            bwPercentage={breakdown?.bwPercentage || 0}
            colorPercentage={breakdown?.colorPercentage || 0}
          />
        </div>
      </div>

      {/* Completed Orders History Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Completed Orders History
            </h3>
            <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md font-normal">
              {totalHistoryCount} {totalHistoryCount === 1 ? "Order" : "Orders"}
            </Badge>
          </div>

          {filters.searchQuery && (
            <span className="text-xs text-neutral-400">
              Filtering by "{filters.searchQuery}"
            </span>
          )}
        </div>

        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
            <p className="text-xs text-neutral-500">Loading order records...</p>
          </div>
        ) : historyJobs.length === 0 ? (
          <Card className="p-10 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/40">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
              <Inbox className="h-8 w-8 text-neutral-400" />
              <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                No completed orders match this filter
              </h4>
              <p className="text-xs text-neutral-500">
                Try selecting a broader date range or clearing your payment and search filters.
              </p>
            </div>
          </Card>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto shadow-2xs">
            <Table>
              <TableHeader className="bg-neutral-50/70 dark:bg-neutral-950/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-medium">PIN</TableHead>
                  <TableHead className="text-xs font-medium">Completed At</TableHead>
                  <TableHead className="text-xs font-medium">Document & Specs</TableHead>
                  <TableHead className="text-xs font-medium">Customer</TableHead>
                  <TableHead className="text-xs font-medium text-right">Amount</TableHead>
                  <TableHead className="w-[150px] text-xs font-medium text-right">
                    Payment Method
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {historyJobs.map((job) => {
                  const firstItem = job.items[0];
                  return (
                    <TableRow key={job.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      {/* 1. PIN */}
                      <TableCell className="font-mono font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                        {job.pickupPin}
                      </TableCell>

                      {/* 2. Date & Time */}
                      <TableCell className="text-xs text-neutral-500">
                        <div>
                          {new Date(job.completedAt || job.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(job.completedAt || job.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>

                      {/* 3. Document & Specs */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-xs text-neutral-900 dark:text-neutral-100">
                            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {firstItem?.originalFilename || "Document"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            <Badge variant="secondary" className="px-1.5 py-0 rounded-md font-normal">
                              {firstItem?.pageCount || 1} pgs
                            </Badge>
                            <Badge variant="outline" className="px-1.5 py-0 rounded-md font-normal">
                              {firstItem?.colorMode === "COLOR" ? "Color" : "B&W"}
                            </Badge>
                            {firstItem?.isDuplex && (
                              <Badge variant="outline" className="px-1.5 py-0 rounded-md font-normal">
                                Duplex
                              </Badge>
                            )}
                            {firstItem && firstItem.copies > 1 && (
                              <Badge variant="outline" className="px-1.5 py-0 rounded-md font-normal">
                                {firstItem.copies}x
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* 4. Customer */}
                      <TableCell className="text-xs text-neutral-500">
                        {job.customerPhoneMasked ? (
                          <span className="font-normal text-neutral-800 dark:text-neutral-200">
                            {job.customerPhoneMasked}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Walk-in</span>
                        )}
                      </TableCell>

                      {/* 5. Amount */}
                      <TableCell className="text-right font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                        ₹{job.totalAmount}
                      </TableCell>

                      {/* 6. Payment Status (Interactive 1-Click Toggle) */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTogglePayment(job.id, job.paymentStatus)}
                          disabled={isUpdatingPayment}
                          className={`h-7 px-2 text-[11px] font-medium rounded-md transition-colors ${
                            job.paymentStatus === "PAID_CASH"
                              ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                              : job.paymentStatus === "PAID_UPI"
                              ? "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                              : "border-amber-300 text-amber-700 hover:bg-amber-50"
                          }`}
                          title="Click to toggle Cash / UPI"
                        >
                          {job.paymentStatus === "PAID_CASH" ? (
                            <>
                              <Banknote className="h-3 w-3 mr-1" />
                              Cash
                            </>
                          ) : job.paymentStatus === "PAID_UPI" ? (
                            <>
                              <CreditCard className="h-3 w-3 mr-1" />
                              UPI
                            </>
                          ) : (
                            "Unpaid"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 print:hidden">
              <span>
                Showing {(filters.page - 1) * filters.limit + 1} to{" "}
                {Math.min(filters.page * filters.limit, totalHistoryCount)} of {totalHistoryCount} orders
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page <= 1}
                  onClick={() => dispatch(setPage(filters.page - 1))}
                  className="h-7 w-7 p-0 rounded-md"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium">
                  Page {filters.page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.page >= totalPages}
                  onClick={() => dispatch(setPage(filters.page + 1))}
                  className="h-7 w-7 p-0 rounded-md"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
