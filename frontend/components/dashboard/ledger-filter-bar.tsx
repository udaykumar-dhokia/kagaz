"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Search,
  X,
  Download,
  Printer,
  CreditCard,
  Banknote,
  Filter,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { LedgerRange, PaymentFilter } from "@/lib/store/slices/ledgerSlice";
import type { EnrichedHistoryJob } from "@/lib/api";

interface LedgerFilterBarProps {
  range: LedgerRange;
  startDate: string;
  endDate: string;
  paymentStatus: PaymentFilter;
  searchQuery: string;
  onRangeChange: (range: LedgerRange) => void;
  onCustomDatesChange: (startDate: string, endDate: string) => void;
  onPaymentStatusChange: (status: PaymentFilter) => void;
  onSearchChange: (query: string) => void;
  onExportCsv: () => void;
  onPrintReport: () => void;
  totalFilteredCount: number;
}

export function LedgerFilterBar({
  range,
  startDate,
  endDate,
  paymentStatus,
  searchQuery,
  onRangeChange,
  onCustomDatesChange,
  onPaymentStatusChange,
  onSearchChange,
  onExportCsv,
  onPrintReport,
  totalFilteredCount,
}: LedgerFilterBarProps) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [isCustomExpanded, setIsCustomExpanded] = useState(range === "custom");

  useEffect(() => {
    setIsCustomExpanded(range === "custom");
  }, [range]);

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (localStart && localEnd) {
      onCustomDatesChange(localStart, localEnd);
    }
  };

  const presetRanges: { label: string; value: LedgerRange }[] = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "7d" },
    { label: "This Month", value: "30d" },
    { label: "Custom Range", value: "custom" },
  ];

  const paymentFilters: { label: string; value: PaymentFilter; icon?: any }[] = [
    { label: "All Payments", value: "ALL" },
    { label: "Cash Only", value: "PAID_CASH", icon: Banknote },
    { label: "UPI Only", value: "PAID_UPI", icon: CreditCard },
    { label: "Unpaid", value: "UNPAID" },
  ];

  return (
    <div className="space-y-3 print:hidden">
      {/* Top Filter Row: Date Presets & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Date Preset Segmented Group */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/60 p-1 rounded-xl">
          {presetRanges.map((preset) => {
            const isActive = range === preset.value;
            return (
              <Button
                key={preset.value}
                type="button"
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  onRangeChange(preset.value);
                  if (preset.value === "custom") {
                    setIsCustomExpanded(true);
                  }
                }}
                className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
                  isActive ? "shadow-2xs" : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        {/* Export & Print Action Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-8 px-3 text-xs font-medium rounded-lg"
            title="Download CSV for Excel or Google Sheets"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-neutral-500" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPrintReport}
            className="h-8 px-3 text-xs font-medium rounded-lg"
            title="Print physical counter closing report"
          >
            <Printer className="h-3.5 w-3.5 mr-1 text-neutral-500" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Custom Date Range Selector (Expands when Custom is chosen) */}
      {isCustomExpanded && (
        <form
          onSubmit={handleApplyCustomDates}
          className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <Calendar className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <span className="font-medium">Custom Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-neutral-400">From:</label>
            <Input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              className="h-8 text-xs rounded-lg w-36 bg-white dark:bg-neutral-900"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-neutral-400">To:</label>
            <Input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              className="h-8 text-xs rounded-lg w-36 bg-white dark:bg-neutral-900"
              required
            />
          </div>

          <Button type="submit" size="sm" className="h-8 px-3 text-xs font-medium rounded-lg">
            Apply Range
          </Button>
        </form>
      )}

      {/* Second Filter Row: Payment Methods & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Payment Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {paymentFilters.map((p) => {
            const isSelected = paymentStatus === p.value;
            const Icon = p.icon;
            return (
              <Button
                key={p.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onPaymentStatusChange(p.value)}
                className={`h-8 px-2.5 text-xs font-medium rounded-lg ${
                  isSelected ? "shadow-2xs" : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 mr-1" />}
                {p.label}
              </Button>
            );
          })}
        </div>

        {/* Search Bar for PIN & Phone */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Search PIN or customer..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs rounded-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
