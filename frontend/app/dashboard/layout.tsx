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

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { logout } from "@/lib/store/slices/authSlice";
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
      title: "Live counter queue",
      href: "/dashboard",
      icon: Printer,
      active: pathname === "/dashboard",
    },
    {
      title: "Services & rates",
      href: "/dashboard/settings",
      icon: SlidersHorizontal,
      active: pathname.startsWith("/dashboard/settings"),
    },
    {
      title: "Counter standee qr",
      href: "/dashboard/standee",
      icon: QrCode,
      active: pathname.startsWith("/dashboard/standee"),
    },
    {
      title: "Daily ledger & reports",
      href: "/dashboard/ledger",
      icon: BarChart3,
      active: pathname.startsWith("/dashboard/ledger"),
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-neutral-200 dark:border-neutral-800">
      {/* Sidebar Header */}
      <SidebarHeader className="border-b border-neutral-200 dark:border-neutral-800 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-2xs">
            <Printer className="h-4.5 w-4.5" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
              <h3 className="font-semibold text-xs tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                {shopData?.name || "Kagaz counter"}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-neutral-500 font-medium">Terminal online</span>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Sidebar Navigation */}
      <SidebarContent className="p-2">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[11px] font-medium text-neutral-400 tracking-wider px-2 mb-1 group-data-[collapsible=icon]:hidden">
              Counter operations
            </SidebarGroupLabel>
          )}
          <SidebarMenu>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={item.active}
                    tooltip={item.title}
                    className={`h-9 text-xs font-medium rounded-lg transition-colors ${
                      item.active
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="group-data-[collapsible=icon]:hidden truncate">
                        {item.title}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar Footer */}
      <SidebarFooter className="border-t border-neutral-200 dark:border-neutral-800 p-2 overflow-hidden">
        <SidebarMenu>
          {shopData?.slug && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href={`/s/${shopData.slug}`} target="_blank" />}
                tooltip="Customer portal"
                className="h-9 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900 rounded-lg"
              >
                <Store className="h-4 w-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="truncate group-data-[collapsible=icon]:hidden">Customer portal</span>
                    <ExternalLink className="h-3 w-3 ml-auto text-neutral-400 group-data-[collapsible=icon]:hidden" />
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onLogout}
              tooltip="Sign out"
              className="h-9 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 rounded-lg"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && (
                <span className="truncate group-data-[collapsible=icon]:hidden">Sign out</span>
              )}
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

  const { shop: shopData, isAuthenticated } = useAppSelector((state) => state.auth);
  const isAudioMuted = useAppSelector((state) => state.queue.isAudioMuted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated === false) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, router]);

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
            <Separator orientation="vertical" className="h-4 bg-neutral-200 dark:border-neutral-800" />
            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {shopData?.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
                  <BellOff className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                  Muted
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                  Chimes on
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
