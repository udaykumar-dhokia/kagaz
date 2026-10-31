"use client";

import React, { useEffect, useState } from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppSelector } from "@/lib/store/hooks";
import {
  fetchShopBillingStatus,
  verifyShopPayment,
  type ShopBillingStatusResponse,
} from "@/lib/api";
import { SubscriptionDialog } from "./subscription-dialog";

export function SubscriptionHeaderPill() {
  const token = useAppSelector((state) => state.auth.token);
  const shop = useAppSelector((state) => state.auth.shop);

  const [billing, setBilling] = useState<ShopBillingStatusResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 shadow-2xs"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Expired · Renew
          </Button>
        )}
      </div>

      {/* Subscription Modal */}
      <SubscriptionDialog
        open={modalOpen && !isActive}
        onOpenChange={setModalOpen}
        onSuccess={loadStatus}
      />
    </>
  );
}
