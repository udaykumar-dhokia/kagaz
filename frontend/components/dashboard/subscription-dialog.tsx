"use client";

import React, { useState } from "react";
import {
  Check,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { KagazMark } from "@/components/ui/logo";
import { toast } from "sonner";
import { useAppSelector } from "@/lib/store/hooks";
import { createDodoCheckoutSession, verifyShopPayment } from "@/lib/api";

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SubscriptionDialog({
  open,
  onOpenChange,
  onSuccess,
}: SubscriptionDialogProps) {
  const token = useAppSelector((state) => state.auth.token);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const handleSyncPayment = async (silent = false) => {
    if (!token) return;
    try {
      setSyncing(true);
      const res = await verifyShopPayment(token);
      if (res.success && res.data) {
        if (res.data.status === "ACTIVE" || res.data.isSubscriptionActive) {
          toast.success("Payment verified. Subscription is active.");
          onOpenChange(false);
          onSuccess?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
              <KagazMark className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Kagaz Subscription
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
            onClick={() => onOpenChange(false)}
            className="flex-1 text-xs h-9 rounded-lg border-neutral-200 dark:border-neutral-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartCheckout}
            disabled={checkoutLoading}
            className="flex-1 text-xs h-9 font-semibold rounded-lg gap-1.5 shadow-2xs"
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
  );
}

