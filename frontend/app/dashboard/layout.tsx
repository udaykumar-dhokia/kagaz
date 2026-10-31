"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Printer,
  SlidersHorizontal,
  QrCode,
  BarChart3,
  LogOut,
  Bell,
  BellOff,
  ExternalLink,
  Store,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KagazLogo, KagazMark } from "@/components/ui/logo";
import { SubscriptionHeaderPill } from "@/components/dashboard/subscription-banner";
import { getShopAvatarUrl } from "@/lib/avatar";
import { fetchShopProfile } from "@/lib/api";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { logout, updateShopData } from "@/lib/store/slices/authSlice";
import { toggleAudioMute } from "@/lib/store/slices/queueSlice";

function DashboardSidebarNav({
  shopData,
  pathname,
  onLogout,
}: {
  shopData: any;
  pathname: string;
  onLogout: () => void;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const navItems = [
    {
      title: "Queue",
      href: "/dashboard",
      icon: Printer,
      active: pathname === "/dashboard",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: SlidersHorizontal,
      active: pathname.startsWith("/dashboard/settings"),
    },
    {
      title: "Shop QR",
      href: "/dashboard/standee",
      icon: QrCode,
      active: pathname.startsWith("/dashboard/standee"),
    },
    {
      title: "Analytics & Reports",
      href: "/dashboard/ledger",
      icon: BarChart3,
      active: pathname.startsWith("/dashboard/ledger"),
    },
    {
      title: "Subscriptions",
      href: "/dashboard/subscription",
      icon: CreditCard,
      active: pathname.startsWith("/dashboard/subscription"),
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-800">
      {/* Sidebar Header */}
      <SidebarHeader
        className={cn(
          "h-14 border-b border-neutral-200 dark:border-neutral-800",
          isCollapsed
            ? "p-0 flex items-center justify-center"
            : "px-3 flex flex-row items-center gap-2.5"
        )}
      >
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            <img
              src={getShopAvatarUrl(shopData?.name, shopData?.logoUrl)}
              alt={shopData?.name || "Shop Logo"}
              className="h-7 w-7 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
            <img
              src={getShopAvatarUrl(shopData?.name, shopData?.logoUrl)}
              alt={shopData?.name || "Shop Logo"}
              className="h-7 w-7 rounded-lg object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
            />
            <h3 className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              {shopData?.name || "Kagaz Counter"}
            </h3>
          </div>
        )}
      </SidebarHeader>

      {/* Sidebar Navigation */}
      <SidebarContent
        className={cn(
          "flex flex-col",
          isCollapsed ? "py-2.5 px-0 items-center gap-1" : "p-2 gap-1"
        )}
      >
        <SidebarGroup className={cn("w-full", isCollapsed ? "p-0 items-center" : "p-0")}>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[11px] font-medium text-neutral-400 tracking-wider px-2.5 mb-1">
              Counter Operations
            </SidebarGroupLabel>
          )}
          <SidebarMenu className={cn("w-full flex flex-col gap-1", isCollapsed ? "items-center" : "")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem
                  key={item.href}
                  className={cn("w-full", isCollapsed ? "flex justify-center" : "")}
                >
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={item.active}
                    tooltip={item.title}
                    className={cn(
                      "text-xs font-medium rounded-lg transition-colors",
                      isCollapsed
                        ? "h-8 w-8 p-0 flex items-center justify-center"
                        : "h-9 w-full px-2.5 flex items-center gap-2.5",
                      item.active
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter
        className={cn(
          "border-t border-neutral-200 dark:border-neutral-800 overflow-hidden",
          isCollapsed ? "py-2.5 px-0 flex flex-col items-center gap-1" : "p-2"
        )}
      >
        <SidebarMenu className={cn("w-full flex flex-col gap-1", isCollapsed ? "items-center" : "")}>
          {shopData?.slug && (
            <SidebarMenuItem className={cn("w-full", isCollapsed ? "flex justify-center" : "")}>
              <SidebarMenuButton
                render={<Link href={`/s/${shopData.slug}`} target="_blank" />}
                tooltip="Customer Portal"
                className={cn(
                  "text-xs font-medium rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900",
                  isCollapsed
                    ? "h-8 w-8 p-0 flex items-center justify-center"
                    : "h-9 w-full px-2.5 flex items-center gap-2.5"
                )}
              >
                <Store className="h-4 w-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate">Customer Portal</span>
                    <ExternalLink className="h-3 w-3 ml-auto text-neutral-400" />
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem className={cn("w-full", isCollapsed ? "flex justify-center" : "")}>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Sign Out"
              className={cn(
                "text-xs font-medium rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                isCollapsed
                  ? "h-8 w-8 p-0 flex items-center justify-center"
                  : "h-9 w-full px-2.5 flex items-center gap-2.5"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);

  const { shop: shopData, isAuthenticated, token } = useAppSelector((state) => state.auth);
  const isAudioMuted = useAppSelector((state) => state.queue.isAudioMuted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated === false) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    if (token) {
      fetchShopProfile(token)
        .then((res) => {
          dispatch(updateShopData(res.data));
        })
        .catch(() => {});
    }
  }, [token, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success("Signed out of counter");
    router.push("/login");
  };

  if (!mounted || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-neutral-500 font-medium">Authenticating counter terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <DashboardSidebarNav
        shopData={shopData}
        pathname={pathname}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <SidebarInset className="bg-neutral-50/40 dark:bg-neutral-950 flex flex-col flex-1">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 text-neutral-600 rounded-lg" />
            <Separator orientation="vertical" className="bg-neutral-200 dark:border-neutral-800" />
            <div className="flex items-center gap-2">
              <img
                src={getShopAvatarUrl(shopData?.name, shopData?.logoUrl)}
                alt={shopData?.name || "Shop Logo"}
                className="h-6 w-6 rounded-md object-cover border border-neutral-200 dark:border-neutral-800"
              />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {shopData?.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SubscriptionHeaderPill />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(toggleAudioMute());
                toast(isAudioMuted ? "Audio chimes unmuted 🔔" : "Audio chimes muted 🔕");
              }}
              className="h-8 px-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 rounded-lg"
              title={isAudioMuted ? "Unmute incoming chimes" : "Mute incoming chimes"}
            >
              {isAudioMuted ? (
                <>
                  <BellOff className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                  Muted
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                  Chimes On
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Dashboard Child View */}
        <main className="p-4 sm:p-6 flex-1 max-w-6xl w-full mx-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
