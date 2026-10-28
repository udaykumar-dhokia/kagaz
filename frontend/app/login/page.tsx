"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Lock, Mail, ArrowRight, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KagazLogo } from "@/components/ui/logo";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { loginShopkeeper } from "@/lib/store/slices/authSlice";

export default function ShopLoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    const result = await dispatch(loginShopkeeper({ email, password }));
    if (loginShopkeeper.fulfilled.match(result)) {
      toast.success("Welcome back! Loading counter terminal...");
      router.push("/dashboard");
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <KagazLogo className="h-9 w-auto" />
          <p className="text-xs text-neutral-500">
            Sign in to access your shop's real-time counter queue
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs rounded-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-semibold">Shopkeeper Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your shop credentials to open the counter queue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="sharma.xerox@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-lg text-xs font-medium shadow-2xs mt-2"
              >
                {isLoading ? "Signing In..." : "Open Counter Terminal"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Register Link */}
        <div className="text-center text-xs text-neutral-500">
          New shopkeeper?{" "}
          <Link
            href="/register"
            className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Register your counter shop
          </Link>
        </div>
      </div>
    </main>
  );
}

