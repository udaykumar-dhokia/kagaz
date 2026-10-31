"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  Loader2,
  Receipt,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAppSelector } from "@/lib/store/hooks";
import {
  fetchShopBillingStatus,
  fetchBillingHistory,
  createDodoCheckoutSession,
  verifyShopPayment,
  type ShopBillingStatusResponse,
  type SubscriptionTransactionItem,
} from "@/lib/api";

export default function SubscriptionPage() {
  const token = useAppSelector((state) => state.auth.token);
  const shop = useAppSelector((state) => state.auth.shop);

  const [billing, setBilling] = useState<ShopBillingStatusResponse["data"] | null>(null);
  const [transactions, setTransactions] = useState<SubscriptionTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        fetchShopBillingStatus(token).catch(() => null),
        fetchBillingHistory(token).catch(() => null),
      ]);

      if (statusRes?.success && statusRes.data) {
        setBilling(statusRes.data);
      }
      if (historyRes?.success && historyRes.data?.transactions) {
        setTransactions(historyRes.data.transactions);
      }
    } catch {
      toast.error("Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();

    // Check if redirected back after completing checkout
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const hasReturn =
        urlParams.has("payment_id") ||
        urlParams.has("subscription_id") ||
        urlParams.has("status") ||
        urlParams.get("billing") === "verify" ||
        urlParams.get("billing") === "success";

      if (hasReturn && token) {
        const paymentId = urlParams.get("payment_id") || undefined;
        const subscriptionId = urlParams.get("subscription_id") || undefined;

        verifyShopPayment(token, { paymentId, subscriptionId })
          .then((res) => {
            if (res.success && res.data) {
              setBilling(res.data);
              if (res.data.status === "ACTIVE" || res.data.isSubscriptionActive) {
                toast.success("Payment confirmed. Subscription is active.");
              }
            }
            // Refresh history table
            fetchBillingHistory(token)
              .then((h) => {
                if (h.success && h.data?.transactions) {
                  setTransactions(h.data.transactions);
                }
              })
              .catch(() => {});
          })
          .catch(() => {})
          .finally(() => {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
          });
      }
    }
  }, [token, loadData]);

  const handleSync = async () => {
    if (!token) return;
    try {
      setSyncing(true);
      const res = await verifyShopPayment(token);
      if (res.success && res.data) {
        setBilling(res.data);
        if (res.data.status === "ACTIVE" || res.data.isSubscriptionActive) {
          toast.success("Payment confirmed. Subscription is active.");
        } else {
          toast.info("Status refreshed. No recent payment confirmed yet.");
        }
      }
      const historyRes = await fetchBillingHistory(token);
      if (historyRes.success && historyRes.data?.transactions) {
        setTransactions(historyRes.data.transactions);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync payment status");
    } finally {
      setSyncing(false);
    }
  };

  const handleStartCheckout = async () => {
    if (!token) return;
    try {
      setCheckoutLoading(true);
      const res = await createDodoCheckoutSession(token);
      if (res.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Could not initiate checkout. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Payment checkout error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const isTrial = billing?.status === "TRIAL" || (!billing?.status && billing?.isTrialActive);
  const isExpired = billing?.status === "EXPIRED" || (!billing?.canAccessPlatform && !isTrial);
  const isActive = billing?.status === "ACTIVE" || billing?.isSubscriptionActive;

  // Formatted date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Subscription & Billing
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {isActive
              ? "Review your counter subscription details and payment history."
              : "Manage your counter subscription, renew access, and review payment history."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-8 px-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 rounded-lg gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-neutral-500 ${syncing ? "animate-spin" : ""}`} />
            Check Status
          </Button>

          {!isActive && (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="h-8 px-3 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 rounded-lg gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Renew Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Inactive Alert Banner if expired */}
      {isExpired && (
        <div className="p-4 sm:p-5 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4 text-neutral-800 dark:text-neutral-200" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Subscription Inactive
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Your counter access is currently paused. Renew your subscription to resume customer print orders.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 h-8 px-3 rounded-lg"
          >
            Renew Subscription
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <Card className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Current Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            {isActive && (
              <Badge
                variant="outline"
                className="h-6 px-2 gap-1.5 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium text-xs rounded-md"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                Active
              </Badge>
            )}
            {isTrial && (
              <Badge
                variant="outline"
                className="h-6 px-2 gap-1.5 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium text-xs rounded-md"
              >
                <Clock className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                Free Trial
              </Badge>
            )}
            {isExpired && (
              <Badge
                variant="outline"
                className="h-6 px-2 gap-1.5 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium text-xs rounded-md"
              >
                <AlertCircle className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                Expired
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {isActive
              ? "Counter active and accepting customer orders"
              : isTrial
              ? `${billing?.trialDaysRemaining ?? 10} days remaining in trial`
              : "Subscription renewal required"}
          </p>
        </Card>

        {/* Days Remaining Card */}
        <Card className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Days Remaining
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {isActive
                ? Math.max(
                    0,
                    Math.ceil(
                      ((billing?.subscriptionEndsAt
                        ? new Date(billing.subscriptionEndsAt).getTime()
                        : Date.now()) -
                        Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : isTrial
                ? billing?.trialDaysRemaining ?? 10
                : 0}
            </span>
            <span className="text-xs text-neutral-500">Days</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {isActive ? "Until next renewal" : "In current evaluation period"}
          </p>
        </Card>

        {/* Renewal Date Card */}
        <Card className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Valid Until
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {isActive
                ? formatDate(billing?.subscriptionEndsAt)
                : formatDate(billing?.trialEndsAt)}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Scheduled renewal date</p>
        </Card>

        {/* Current Plan Card */}
        <Card className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-4">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Current Plan
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              ₹399
            </span>
            <span className="text-xs text-neutral-500">/ month</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Standard Monthly Plan</p>
        </Card>
      </div>

      {/* Plan Features Card */}
      <Card className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Included Counter Capabilities
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            All features active for your shop counter terminal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              "Unlimited Customer QR Print Orders",
              "Zero WhatsApp Number Sharing & File Clutter",
              "Real-Time Counter Queue & Local Print Dispatch",
              "Daily Ledger, Cash vs. UPI Tracking & CSV Export",
              "Ephemeral Document Privacy with Auto-Deletion",
              "UPI Payments via PhonePe, GPay, Paytm & Cards",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300">
                <div className="h-4 w-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-300 dark:border-neutral-700">
                  <Check className="h-2.5 w-2.5 text-neutral-900 dark:text-neutral-100" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table Card */}
      <Card className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Payment History
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Records of all subscription payments and renewals for this counter.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-7 text-xs text-neutral-600 dark:text-neutral-400 gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Date & Time
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Transaction Reference
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Plan
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                        <span className="text-xs text-neutral-500">Loading payment history...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5 text-neutral-400">
                        <Receipt className="h-6 w-6 stroke-[1.5]" />
                        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          No Payment Transactions Yet
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Your payments will appear here once you renew your monthly counter subscription.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow
                      key={tx.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30"
                    >
                      <TableCell className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500 font-mono">
                        {tx.dodoPaymentId || tx.id.slice(0, 16)}
                      </TableCell>
                      <TableCell className="text-xs text-neutral-700 dark:text-neutral-300">
                        {tx.planType === "MONTHLY" ? "Monthly Plan" : tx.planType}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 text-right">
                        ₹{Number(tx.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium h-5 px-1.5 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                        >
                          {tx.status === "SUCCESS" ? "Successful" : tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Dialog Modal */}
      <Dialog open={modalOpen && !isActive} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
                <Sparkles className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
              </div>
              <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Counter Subscription
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500 leading-relaxed">
              Accept customer QR orders, dispatch prints to your counter terminals, and
              track daily ledger records.
            </DialogDescription>
          </DialogHeader>

          {/* Pricing Box */}
          <div className="mt-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-500">Monthly Plan</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  ₹399
                </span>
                <span className="text-xs text-neutral-500">/ month</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">Inclusive of taxes · Cancel anytime</p>
            </div>
          </div>

          {/* Included Features */}
          <div className="mt-4 space-y-2.5">
            {[
              "Unlimited Customer QR Print Orders",
              "Zero WhatsApp Number Sharing & File Clutter",
              "Real-Time Counter Queue & Local Print Dispatch",
              "Daily Ledger, Cash vs. UPI Tracking & CSV Export",
              "UPI Payments via PhonePe, GPay, Paytm & Cards",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                <div className="h-4 w-4 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0 border border-neutral-300 dark:border-neutral-700">
                  <Check className="h-2.5 w-2.5 text-neutral-900 dark:text-neutral-100" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* Security Notice */}
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
              Secure 256-Bit Payment Gateway
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="h-6 px-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 rounded"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Check Status
                </>
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="flex-1 text-xs h-9 rounded-lg border-neutral-200 dark:border-neutral-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartCheckout}
              disabled={checkoutLoading}
              className="flex-1 text-xs h-9 font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 rounded-lg gap-1.5"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Proceed to Pay
                  <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
