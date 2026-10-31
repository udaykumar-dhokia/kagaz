"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Store,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  CreditCard,
  Layers,
  Palette,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KagazLogo } from "@/components/ui/logo";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { registerShopkeeper } from "@/lib/store/slices/authSlice";

export default function ShopRegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  // 2-Step Registration State
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1: Basic Auth & Account Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Printing & Shop Details
  const [address, setAddress] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bwSinglePrice, setBwSinglePrice] = useState("2.00");
  const [bwDoublePrice, setBwDoublePrice] = useState("1.50");
  const [isDuplexEnabled, setIsDuplexEnabled] = useState(true);
  const [isColorEnabled, setIsColorEnabled] = useState(false);
  const [colorSinglePrice, setColorSinglePrice] = useState("10.00");
  const [colorDoublePrice, setColorDoublePrice] = useState("8.00");

  // Validate Step 1 and proceed to Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your shop name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    setCurrentStep(2);
  };

  // Complete Registration at Step 2
  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please complete all required account details");
      setCurrentStep(1);
      return;
    }

    const result = await dispatch(
      registerShopkeeper({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        address: address.trim() || undefined,
        upiId: upiId.trim() || undefined,
        isColorEnabled,
        isDuplexEnabled,
        bwSinglePrice: parseFloat(bwSinglePrice) || 2.0,
        bwDoublePrice: parseFloat(bwDoublePrice) || 1.5,
        colorSinglePrice: parseFloat(colorSinglePrice) || 10.0,
        colorDoublePrice: parseFloat(colorDoublePrice) || 8.0,
      })
    );

    if (registerShopkeeper.fulfilled.match(result)) {
      toast.success("Shop registered successfully! Counter standee ready.");
      router.push("/dashboard");
    } else {
      toast.error(result.payload as string);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-950 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <KagazLogo className="h-9 w-auto" />
          <p className="text-xs text-neutral-500">
            Generate your unique shop standee in 30 seconds
          </p>
        </div>

        {/* Register Card */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs rounded-xl overflow-hidden">
          {/* Step Progress Bar Indicator */}
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    currentStep === 1
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {currentStep > 1 ? <Check className="h-3.5 w-3.5" /> : "1"}
                </div>
                <span
                  className={`text-xs ${
                    currentStep === 1
                      ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                      : "text-neutral-500 font-medium"
                  }`}
                >
                  Account Details
                </span>
              </div>

              <div className="h-px flex-1 mx-3 bg-neutral-200 dark:bg-neutral-800" />

              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    currentStep === 2
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-xs ${
                    currentStep === 2
                      ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                      : "text-neutral-400 font-medium"
                  }`}
                >
                  Shop & Print Rates
                </span>
              </div>
            </div>
          </div>

          {/* STEP 1: BASIC AUTH & ACCOUNT DETAILS */}
          {currentStep === 1 && (
            <div className="animate-in fade-in duration-150">
              <CardHeader className="space-y-1 pb-4 pt-3">
                <CardTitle className="text-base font-semibold">Account Credentials</CardTitle>
                <CardDescription className="text-xs">
                  Step 1 of 2: Set up your shop login and counter credentials
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleProceedToStep2} className="space-y-4">
                  {/* Shop Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Shop / Counter Name *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <Input
                        placeholder="e.g. Sharma Xerox & Cyber Cafe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-9 h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <Input
                        type="email"
                        placeholder="owner@sharma-xerox.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9 h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>Phone Number</span>
                      <span className="text-[11px] text-neutral-400 font-normal">Optional</span>
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <Input
                        type="tel"
                        placeholder="+91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pl-9 pr-9 h-9 text-xs rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <Button
                    type="submit"
                    className="w-full h-10 rounded-lg text-xs font-medium shadow-2xs mt-2"
                  >
                    <span>Continue to Shop & Rates</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </form>
              </CardContent>
            </div>
          )}

          {/* STEP 2: PRINTING & SHOP DETAILS */}
          {currentStep === 2 && (
            <div className="animate-in fade-in duration-150">
              <CardHeader className="space-y-1 pb-4 pt-3">
                <CardTitle className="text-base font-semibold">Shop & Print Rates</CardTitle>
                <CardDescription className="text-xs">
                  Step 2 of 2: Configure your rate card and counter settings
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleCompleteRegister} className="space-y-4">
                  {/* Shop Address */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>Shop Address / Landmark</span>
                      <span className="text-[11px] text-neutral-400 font-normal">Optional</span>
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <Input
                        placeholder="e.g. Shop 4, College Road, Near City Library"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center justify-between">
                      <span>UPI ID / VPA for Counter</span>
                      <span className="text-[11px] text-neutral-400 font-normal">Optional</span>
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                      <Input
                        placeholder="e.g. yourshop@okhdfcbank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Black & White Rates */}
                  <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <Label className="text-xs font-medium">B&W Printing Rates (₹)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-500">Single-Sided (₹)</span>
                        <Input
                          type="number"
                          step="0.5"
                          value={bwSinglePrice}
                          onChange={(e) => setBwSinglePrice(e.target.value)}
                          className="h-8 text-xs text-right rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-500">Double-Sided (₹/side)</span>
                        <Input
                          type="number"
                          step="0.5"
                          value={bwDoublePrice}
                          onChange={(e) => setBwDoublePrice(e.target.value)}
                          className="h-8 text-xs text-right rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duplex Toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Double-Sided Printing</span>
                      </Label>
                      <p className="text-[11px] text-neutral-400">Allow customers to choose 2-sided prints</p>
                    </div>
                    <Switch checked={isDuplexEnabled} onCheckedChange={setIsDuplexEnabled} />
                  </div>

                  {/* Color Toggle & Rates */}
                  <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Palette className="h-3.5 w-3.5 text-neutral-400" />
                          <span>Offer Color Printing?</span>
                        </Label>
                        <p className="text-[11px] text-neutral-400">Can be toggled anytime in dashboard</p>
                      </div>
                      <Switch checked={isColorEnabled} onCheckedChange={setIsColorEnabled} />
                    </div>

                    {isColorEnabled && (
                      <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500">Color Single-Sided (₹)</span>
                          <Input
                            type="number"
                            step="0.5"
                            value={colorSinglePrice}
                            onChange={(e) => setColorSinglePrice(e.target.value)}
                            className="h-8 text-xs text-right rounded-lg"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-500">Color Double-Sided (₹/side)</span>
                          <Input
                            type="number"
                            step="0.5"
                            value={colorDoublePrice}
                            onChange={(e) => setColorDoublePrice(e.target.value)}
                            className="h-8 text-xs text-right rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Back + Submit */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="h-10 px-3.5 rounded-lg text-xs font-medium shrink-0"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                      Back
                    </Button>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 h-10 rounded-lg text-xs font-medium shadow-2xs"
                    >
                      {isLoading ? "Creating Shop & Standee..." : "Complete Registration & Launch"}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </div>
          )}
        </Card>

        {/* Login Link */}
        <div className="text-center text-xs text-neutral-500">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            Sign in to your counter
          </Link>
        </div>
      </div>
    </main>
  );
}
