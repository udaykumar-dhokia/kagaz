"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  createDodoCheckoutSession,
  verifyShopPayment,
  type ShopBillingStatusResponse,
} from "@/lib/api";

export function SubscriptionHeaderPill() {
  const token = useAppSelector((state) => state.auth.token);
  const shop = useAppSelector((state) => state.auth.shop);

  const [billing, setBilling] = useState<ShopBillingStatusResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loadStatus = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetchShopBillingStatus(token);
      if (res.success && res.data) {
        setBilling(res.data);
      }
    } catch {
      if (shop?.subscription) {
        setBilling(shop.subscription as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPayment = async (silent = false) => {
    if (!token) return;
    try {
      setSyncing(true);
      const res = await verifyShopPayment(token);
      if (res.success && res.data) {
        setBilling(res.data);
        if (res.data.status === "ACTIVE" || res.data.isSubscriptionActive) {
          toast.success("Payment verified. Subscription is active.");
          setModalOpen(false);
        } else if (!silent) {
          toast.info("Status refreshed. No recent payment confirmed yet.");
        }
      }
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.message || "Failed to sync payment status");
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    // Check if redirected back after Dodo checkout
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const hasPaymentReturn =
        urlParams.has("payment_id") ||
        urlParams.has("subscription_id") ||
        urlParams.has("status") ||
        urlParams.get("billing") === "verify" ||
        urlParams.get("billing") === "success";

      if (hasPaymentReturn) {
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
          })
          .catch(() => {})
          .finally(() => {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);
          });
      } else {
        loadStatus();
      }
    } else {
      loadStatus();
    }
  }, [token]);

  const handleStartCheckout = async () => {
    if (!token) return;
    try {
      setCheckoutLoading(true);
      const res = await createDodoCheckoutSession(token);
      if (res.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Could not initiate checkout session. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Payment checkout error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!billing && !loading) {
    return null;
  }

  const isTrial = billing?.status === "TRIAL" || (!billing?.status && billing?.isTrialActive);
  const isExpired = billing?.status === "EXPIRED" || (!billing?.canAccessPlatform && !isTrial);
  const isActive = billing?.status === "ACTIVE" || billing?.isSubscriptionActive;

  return (
    <>
      <div className="flex items-center gap-1.5">
        {isTrial && (
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              Free Trial: {billing?.trialDaysRemaining ?? 10} Days Left
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="h-5 px-1.5 text-[11px] font-semibold text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 ml-1 rounded"
            >
              Upgrade
            </Button>
          </div>
        )}

        {isActive && (
          <Badge
            variant="outline"
            className="h-7 px-2.5 gap-1.5 border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-medium text-xs rounded-lg"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
            Active
          </Badge>
        )}

        {isExpired && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-7 px-2.5 text-xs font-semibold border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg gap-1.5 hover:bg-neutral-200"
          >
            <AlertCircle className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
            Expired · Renew
          </Button>
        )}
      </div>

      {/* Subscription Modal */}
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

          {/* Security Notice & Already Paid Sync Button */}
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
              Secure 256-Bit Payment Gateway
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSyncPayment(false)}
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

          {/* Action Button */}
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
    </>
  );
}
