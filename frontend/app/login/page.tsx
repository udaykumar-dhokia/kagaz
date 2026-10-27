"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Lock, Mail, ArrowRight, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { loginShop } from "@/lib/api";

export default function ShopLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginShop({ email, password });
      toast.success("Welcome back! Loading counter terminal...");

      // Save token and shop data
      localStorage.setItem("kagaz_shop_token", res.data.token);
      localStorage.setItem("kagaz_shop_data", JSON.stringify(res.data.shop));

      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm">
            <Printer className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Kagaz Counter Terminal</h1>
          <p className="text-xs text-neutral-500">
            Sign in to access your shop's real-time counter queue
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold">Shopkeeper Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your shop credentials to open the counter queue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="sharma.xerox@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-lg text-xs font-bold shadow-xs mt-2"
              >
                {isLoading ? "Signing in..." : "Open Counter Terminal"}
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
            className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Register your Xerox shop
          </Link>
        </div>
      </div>
    </main>
  );
}

