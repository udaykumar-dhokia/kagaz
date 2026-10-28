"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, Lock, Mail, Phone, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { registerShop } from "@/lib/api";

export default function ShopRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isColorEnabled, setIsColorEnabled] = useState(false);
  const [bwSinglePrice, setBwSinglePrice] = useState("2.00");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerShop({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        isColorEnabled,
        bwSinglePrice: parseFloat(bwSinglePrice) || 2.0,
      });

      toast.success("Shop registered successfully! Counter standee QR ready.");

      // Save token and shop data
      localStorage.setItem("kagaz_shop_token", res.data.token);
      localStorage.setItem("kagaz_shop_data", JSON.stringify(res.data.shop));

      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-950 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Register Xerox & Print Shop</h1>
          <p className="text-xs text-neutral-500">
            Generate your unique shop QR code standee in 30 seconds
          </p>
        </div>

        {/* Register Card */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-bold">Shop Information</CardTitle>
            <CardDescription className="text-xs">
              Provide basic shop info to activate your instant counter portal
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Shop Name *</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="e.g. Sharma Xerox & Cyber Cafe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address (Login) *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="owner@sharma-xerox.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <Input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-9 h-10 text-xs"
                  />
                </div>
              </div>

              {/* Quick Preferences */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Offer Color Printing?</Label>
                    <p className="text-[11px] text-neutral-400">Can be toggled anytime in dashboard</p>
                  </div>
                  <Switch checked={isColorEnabled} onCheckedChange={setIsColorEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">B&W Rate Per Page</Label>
                    <p className="text-[11px] text-neutral-400">Default rate for A4 single-sided</p>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.5"
                      value={bwSinglePrice}
                      onChange={(e) => setBwSinglePrice(e.target.value)}
                      className="h-8 text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg text-xs font-bold shadow-xs mt-3"
              >
                {isLoading ? "Creating Shop & Standee..." : "Register & Generate QR Standee"}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="text-center text-xs text-neutral-500">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-semibold text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Sign in to your counter
          </Link>
        </div>
      </div>
    </main>
  );
}

