"use client";

import React, { useState } from "react";
import {
  Banknote,
  CreditCard,
  Layers,
  Palette,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimelineItem {
  key: string;
  label: string;
  date?: string;
  revenue: number;
  orders: number;
  cash: number;
  upi: number;
  bwPages: number;
  colorPages: number;
}

interface RevenueTimelineChartProps {
  timeline: TimelineItem[];
  isSingleDay: boolean;
  rangeLabel: string;
}

export function RevenueTimelineChart({
  timeline,
  isSingleDay,
  rangeLabel,
}: RevenueTimelineChartProps) {
  const [metric, setMetric] = useState<"revenue" | "orders">("revenue");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // If single-day, filter or slice to visible active hours if desired, or all 24h
  // Let's filter to 06:00 - 23:00 to give high resolution to shop operating hours
  const displayItems = isSingleDay
    ? timeline.filter((t) => {
        const hour = parseInt(t.key.split(":")[0] || "0", 10);
        return hour >= 7 && hour <= 22; // 7 AM to 10 PM
      })
    : timeline;

  const values = displayItems.map((d) => (metric === "revenue" ? d.revenue : d.orders));
  const rawMax = Math.max(...values, 0);
  const maxValue = rawMax === 0 ? (metric === "revenue" ? 100 : 5) : Math.ceil(rawMax * 1.15);

  const chartHeight = 180;
  const chartWidth = 720;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;

  const barCount = displayItems.length;
  const barGap = barCount > 20 ? 4 : 8;
  const barWidth = Math.max(8, (usableWidth - barGap * (barCount - 1)) / (barCount || 1));

  // Y-axis ticks
  const yTicks = [
    maxValue,
    Math.round(maxValue * 0.66),
    Math.round(maxValue * 0.33),
    0,
  ];

  const activePoint = hoveredIndex !== null ? displayItems[hoveredIndex] : null;

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl overflow-hidden">
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Revenue & Volume Analysis</span>
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            {isSingleDay
              ? `Hourly counter activity for ${rangeLabel}`
              : `Daily performance trend for ${rangeLabel}`}
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-lg self-start sm:self-auto">
          <Button
            type="button"
            variant={metric === "revenue" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMetric("revenue")}
            className="h-7 px-2.5 text-xs font-medium rounded-md"
          >
            Revenue (₹)
          </Button>
          <Button
            type="button"
            variant={metric === "orders" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMetric("orders")}
            className="h-7 px-2.5 text-xs font-medium rounded-md"
          >
            Orders Count
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {/* Active Tooltip Details Banner */}
        <div className="h-7 mb-2 flex items-center justify-between text-xs px-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
          {activePoint ? (
            <div className="flex items-center gap-3 font-medium">
              <span className="text-neutral-900 dark:text-neutral-100">
                {activePoint.label}
              </span>
              <span className="text-neutral-400">•</span>
              <span className="text-primary font-semibold">
                ₹{activePoint.revenue.toFixed(2)}
              </span>
              <span className="text-neutral-500 text-[11px]">
                ({activePoint.orders} {activePoint.orders === 1 ? "order" : "orders"})
              </span>
              <span className="text-neutral-400 hidden sm:inline">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] hidden sm:inline">
                Cash: ₹{activePoint.cash.toFixed(2)}
              </span>
              <span className="text-blue-600 dark:text-blue-400 text-[11px] hidden sm:inline">
                UPI: ₹{activePoint.upi.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Hover over any bar to inspect hourly revenue & order splits
            </span>
          )}
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 sm:h-56 select-none"
          >
            <defs>
              <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0072E5" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#75D8FC" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="orderBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.75" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((val, idx) => {
              const y = paddingTop + usableHeight - (val / maxValue) * usableHeight;
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-neutral-200 dark:text-neutral-800"
                    strokeDasharray={idx === yTicks.length - 1 ? undefined : "3 3"}
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-neutral-400 font-mono"
                  >
                    {metric === "revenue" ? `₹${val}` : val}
                  </text>
                </g>
              );
            })}

            {/* Chart Bars */}
            {displayItems.map((item, idx) => {
              const val = metric === "revenue" ? item.revenue : item.orders;
              const barHeight = val > 0 ? Math.max(4, (val / maxValue) * usableHeight) : 2;
              const x = paddingLeft + idx * (barWidth + barGap);
              const y = paddingTop + usableHeight - barHeight;
              const isHovered = hoveredIndex === idx;

              return (
                <g
                  key={idx}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Invisible broad hover catcher */}
                  <rect
                    x={x - barGap / 2}
                    y={paddingTop}
                    width={barWidth + barGap}
                    height={usableHeight}
                    fill="transparent"
                  />

                  {/* Visual Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="3"
                    fill={metric === "revenue" ? "url(#revenueBarGrad)" : "url(#orderBarGrad)"}
                    opacity={isHovered ? 1 : hoveredIndex !== null ? 0.45 : 0.9}
                    className="transition-all duration-150"
                  />

                  {/* Active highlight border */}
                  {isHovered && (
                    <rect
                      x={x - 1}
                      y={y - 1}
                      width={barWidth + 2}
                      height={barHeight + 2}
                      rx="4"
                      fill="none"
                      stroke="#0072E5"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* X-axis Label (Show every 2nd on mobile or all on spacious) */}
                  {(barCount <= 16 || idx % 2 === 0) && (
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className={`text-[9px] font-sans ${
                        isHovered
                          ? "fill-primary font-semibold"
                          : "fill-neutral-400 dark:fill-neutral-500"
                      }`}
                    >
                      {item.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

interface PaymentSplitDonutProps {
  cashCollected: number;
  upiCollected: number;
  unpaidAmount: number;
  totalRevenue: number;
  cashPercentage: number;
  upiPercentage: number;
}

export function PaymentSplitDonut({
  cashCollected,
  upiCollected,
  unpaidAmount,
  totalRevenue,
  cashPercentage,
  upiPercentage,
}: PaymentSplitDonutProps) {
  // Donut SVG parameters
  const size = 160;
  const strokeWidth = 18;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const cashDash = (cashPercentage / 100) * circumference;
  const upiDash = (upiPercentage / 100) * circumference;
  const unpaidDash = Math.max(0, circumference - cashDash - upiDash);

  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <span>Payment Method Split</span>
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          Cash in drawer vs. online UPI settlements
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Donut Graphic */}
        <div className="flex items-center justify-center py-1">
          <div className="relative">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-neutral-100 dark:text-neutral-800"
                strokeWidth={strokeWidth}
              />

              {totalRevenue > 0 && (
                <>
                  {/* Cash Segment (Emerald) */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${cashDash} ${circumference}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />

                  {/* UPI Segment (Blue) */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#0072E5"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${upiDash} ${circumference}`}
                    strokeDashoffset={-cashDash}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </>
              )}
            </svg>

            {/* Inner Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-neutral-400 font-medium">Reconciled</span>
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                ₹{totalRevenue.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-neutral-600 dark:text-neutral-400">Cash in Drawer</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
              <span>₹{cashCollected.toFixed(2)}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {cashPercentage}%
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
              <span className="text-neutral-600 dark:text-neutral-400">UPI Settlement</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100">
              <span>₹{upiCollected.toFixed(2)}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {upiPercentage}%
              </Badge>
            </div>
          </div>

          {unpaidAmount > 0 && (
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Unpaid / Pending</span>
              </div>
              <span className="font-semibold">₹{unpaidAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PrintVolumeBreakdownBarProps {
  totalPages: number;
  bwPages: number;
  colorPages: number;
  duplexSheets: number;
  bwPercentage: number;
  colorPercentage: number;
}

export function PrintVolumeBreakdownBar({
  totalPages,
  bwPages,
  colorPages,
  duplexSheets,
  bwPercentage,
  colorPercentage,
}: PrintVolumeBreakdownBarProps) {
  return (
    <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
          <Palette className="h-4 w-4 text-amber-500" />
          <span>Print Volume & Paper Usage</span>
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          Color mode ratio & duplex paper savings
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Total Pages Hero */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {totalPages.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 ml-1.5 font-normal">Total Pages Printed</span>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {bwPages} B&W • {colorPages} Color
          </Badge>
        </div>

        {/* Stacked Visual Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-100 dark:bg-neutral-800">
          <div
            style={{ width: `${bwPercentage}%` }}
            className="h-full bg-neutral-800 dark:bg-neutral-300 transition-all duration-500"
            title={`Black & White: ${bwPages} pgs (${bwPercentage}%)`}
          />
          <div
            style={{ width: `${colorPercentage}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Color: ${colorPages} pgs (${colorPercentage}%)`}
          />
        </div>

        {/* Legend & Duplex Savings */}
        <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-800 dark:bg-neutral-300 shrink-0" />
              <span className="text-neutral-600 dark:text-neutral-400">Black & White</span>
            </div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {bwPages} pgs ({bwPercentage}%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-neutral-600 dark:text-neutral-400">Color Printing</span>
            </div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {colorPages} pgs ({colorPercentage}%)
            </span>
          </div>

          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 mt-1">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Duplex Paper Saved:</span>
            </div>
            <span className="text-[11px] font-semibold">
              {duplexSheets} sheets saved
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
