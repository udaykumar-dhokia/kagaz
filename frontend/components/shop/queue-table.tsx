"use client";

import React from "react";
import {
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  Palette,
  FileText,
  User,
  Sparkles,
  Inbox,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { QueueJob } from "@/lib/api";

interface QueueTableProps {
  jobs: QueueJob[];
  onSelectJob: (job: QueueJob) => void;
  onQuickComplete: (jobId: string) => void;
}

export function QueueTable({ jobs, onSelectJob, onQuickComplete }: QueueTableProps) {
  if (jobs.length === 0) {
    return (
      <Card className="border border-dashed border-neutral-300 dark:border-neutral-800 p-12 text-center bg-white/40 dark:bg-neutral-900/20">
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <Inbox className="h-7 w-7 text-neutral-500" />
          </div>

          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
            No active orders
          </h3>
          <p className="text-xs text-neutral-500">
            New customer print jobs will appear here automatically.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-x-auto shadow-2xs">
      <Table>
        <TableHeader className="bg-neutral-50/70 dark:bg-neutral-950/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[120px] text-xs font-medium">Pin</TableHead>
            <TableHead className="text-xs font-medium">Document & specs</TableHead>
            <TableHead className="text-xs font-medium">Customer</TableHead>
            <TableHead className="text-xs font-medium text-right">Collect</TableHead>
            <TableHead className="w-[160px] text-xs font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => {
            const firstItem = job.items[0];
            return (
              <TableRow
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="cursor-pointer hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
              >
                {/* 1. PIN */}
                <TableCell className="font-normal">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-semibold tracking-wide text-neutral-900 dark:text-neutral-100">
                      {job.pickupPin}
                    </span>
                    {job.status === "PRINTING" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" title="Printing" />
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(job.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </TableCell>

                {/* 2. Document & Specs */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-xs text-neutral-900 dark:text-neutral-100">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[240px]">
                        {firstItem?.originalFilename || "Document.pdf"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[11px]">
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal rounded-md">
                        {firstItem?.pageCount} pgs
                        {firstItem?.pageRange !== "all" && ` (${firstItem?.pageRange})`}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`px-1.5 py-0 text-[10px] rounded-md font-normal ${
                          firstItem?.colorMode === "COLOR"
                            ? "border-amber-500 text-amber-700 dark:text-amber-300"
                            : ""
                        }`}
                      >
                        {firstItem?.colorMode === "COLOR" ? "Color" : "B&w"}
                      </Badge>

                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] rounded-md font-normal">
                        {firstItem?.isDuplex ? "Duplex" : "Single"}
                      </Badge>

                      {firstItem && firstItem.copies > 1 && (
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] rounded-md font-normal">
                          {firstItem.copies}x
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* 3. Customer */}
                <TableCell className="text-xs text-neutral-500">
                  {job.customerPhoneMasked ? (
                    <span className="font-normal text-neutral-800 dark:text-neutral-200">
                      {job.customerPhoneMasked}
                    </span>
                  ) : (
                    <span className="text-neutral-400">Walk-in</span>
                  )}
                </TableCell>

                {/* 4. Total Amount */}
                <TableCell className="text-right">
                  <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    ₹{job.totalAmount}
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 px-1 py-0 rounded-md font-normal">
                    {job.paymentStatus === "PAID_UPI" ? "Upi" : "Cash"}
                  </Badge>
                </TableCell>

                {/* 5. Actions */}
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => onSelectJob(job)}
                      className="h-8 px-3 rounded-lg text-xs font-medium shadow-2xs"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onQuickComplete(job.id)}
                      className="h-8 w-8 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      title="Quick complete"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

