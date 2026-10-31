"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  SlidersHorizontal,
  Palette,
  Layers,
  Save,
  Plus,
  Trash2,
  Store,
  UploadCloud,
  CheckCircle2,
  Phone,
  MapPin,
  CreditCard,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchCatalogSettings,
  saveCatalogSettings,
  createAddon,
  removeAddon,
  setBwEnabled,
  setBwSinglePrice,
  setBwDoublePrice,
  setColorEnabled,
  setColorSinglePrice,
  setColorDoublePrice,
  setDuplexEnabled,
} from "@/lib/store/slices/catalogSlice";
import { updateShopData } from "@/lib/store/slices/authSlice";
import {
  fetchShopProfile,
  updateShopProfile,
  uploadShopLogo,
  deleteShopLogo,
} from "@/lib/api";
import { getShopAvatarUrl } from "@/lib/avatar";

export default function DashboardSettingsPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const currentShop = useAppSelector((state) => state.auth.shop);

  const [activeTab, setActiveTab] = useState<"profile" | "services">("profile");

  // Shop Profile state
  const [shopName, setShopName] = useState(currentShop?.name || "");
  const [ownerPhone, setOwnerPhone] = useState(currentShop?.ownerPhone || "");
  const [address, setAddress] = useState(currentShop?.address || "");
  const [upiId, setUpiId] = useState(currentShop?.upiId || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(currentShop?.logoUrl || null);
  const [shopSlug, setShopSlug] = useState(currentShop?.slug || "");

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catalog state from Redux
  const {
    isBwEnabled,
    bwSinglePrice,
    bwDoublePrice,
    isColorEnabled,
    colorSinglePrice,
    colorDoublePrice,
    isDuplexEnabled,
    addons,
    isLoading: isLoadingCatalog,
    isSaving: isSavingCatalog,
  } = useAppSelector((state) => state.catalog);

  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [isAddingAddon, setIsAddingAddon] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Load Catalog
    dispatch(fetchCatalogSettings(token));

    // Load Shop Profile
    setIsLoadingProfile(true);
    fetchShopProfile(token)
      .then((res) => {
        const p = res.data;
        setShopName(p.name || "");
        setOwnerPhone(p.ownerPhone || "");
        setAddress(p.address || "");
        setUpiId(p.upiId || "");
        setLogoUrl(p.logoUrl || null);
        setShopSlug(p.slug || "");
        dispatch(
          updateShopData({
            name: p.name,
            slug: p.slug,
            ownerEmail: p.ownerEmail,
            ownerPhone: p.ownerPhone,
            address: p.address,
            upiId: p.upiId,
            logoUrl: p.logoUrl,
            avatarUrl: p.avatarUrl,
          })
        );
      })
      .catch((err) => {
        console.error("Failed to fetch shop profile:", err);
      })
      .finally(() => {
        setIsLoadingProfile(false);
      });
  }, [token, dispatch]);

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!shopName.trim()) {
      toast.error("Shop name is required");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateShopProfile(token, {
        name: shopName.trim(),
        ownerPhone: ownerPhone.trim() || null,
        address: address.trim() || null,
        upiId: upiId.trim() || null,
      });

      dispatch(
        updateShopData({
          name: res.data.name,
          ownerPhone: res.data.ownerPhone,
          address: res.data.address,
          upiId: res.data.upiId,
          logoUrl: res.data.logoUrl,
          avatarUrl: res.data.avatarUrl,
        })
      );
      toast.success("Shop profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Logo File Selection & Upload
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const res = await uploadShopLogo(token, file);
      setLogoUrl(res.data.logoUrl);
      dispatch(
        updateShopData({
          logoUrl: res.data.logoUrl,
          avatarUrl: res.data.avatarUrl,
        })
      );
      toast.success("Shop logo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload shop logo");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove Logo
  const handleRemoveLogo = async () => {
    if (!token) return;
    setIsRemovingLogo(true);
    try {
      const res = await deleteShopLogo(token);
      setLogoUrl(null);
      dispatch(
        updateShopData({
          logoUrl: null,
          avatarUrl: res.data.avatarUrl,
        })
      );
      toast.info("Shop logo removed. Default avatar restored.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove logo");
    } finally {
      setIsRemovingLogo(false);
    }
  };

  const handleCopyPortalUrl = () => {
    if (!shopSlug) return;
    const portalUrl = `${window.location.origin}/s/${shopSlug}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedSlug(true);
    toast.success("Customer portal link copied!");
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  // Catalog Save
  const handleSaveCatalog = async () => {
    if (!token) return;

    const result = await dispatch(
      saveCatalogSettings({
        token,
        settings: {
          isBwEnabled,
          bwSinglePrice: parseFloat(bwSinglePrice) || 2.0,
          bwDoublePrice: parseFloat(bwDoublePrice) || 1.5,
          isColorEnabled,
          colorSinglePrice: parseFloat(colorSinglePrice) || 10.0,
          colorDoublePrice: parseFloat(colorDoublePrice) || 8.0,
          isDuplexEnabled,
        },
      })
    );

    if (saveCatalogSettings.fulfilled.match(result)) {
      toast.success("Services and rates updated! Customer rates immediately updated.");
    } else {
      toast.error(result.payload as string);
    }
  };

  // Add-on Manager
  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newAddonName.trim() || !newAddonPrice) return;

    setIsAddingAddon(true);
    const result = await dispatch(
      createAddon({
        token,
        name: newAddonName.trim(),
        price: parseFloat(newAddonPrice),
        type: "CUSTOM",
      })
    );
    setIsAddingAddon(false);

    if (createAddon.fulfilled.match(result)) {
      setNewAddonName("");
      setNewAddonPrice("");
      toast.success(`Added "${result.payload.name}" to catalog`);
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleDeleteAddon = async (id: string, name: string) => {
    if (!token) return;
    const result = await dispatch(removeAddon({ token, id }));
    if (removeAddon.fulfilled.match(result)) {
      toast.info(`Removed "${name}" from catalog`);
    } else {
      toast.error(result.payload as string);
    }
  };

  const resolvedAvatar = getShopAvatarUrl(shopName, logoUrl);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Shop Settings
          </h1>
          <p className="text-xs text-neutral-500">
            Manage your shop profile, custom branding logo, and counter print rate card.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="inline-flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "profile"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            <span>Shop Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "services"
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Services & Rates</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SHOP PROFILE & BRANDING                                        */}
      {/* ===================================================================== */}
      {activeTab === "profile" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* 1. Shop Logo & Branding Card */}
          <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>Shop Logo & Branding</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Your logo is displayed on the customer upload portal, standee card, and counter tickets.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {/* Visual Avatar / Logo Box */}
                <div className="relative group shrink-0">
                  <div className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 shadow-xs flex items-center justify-center">
                    <img
                      src={resolvedAvatar}
                      alt={shopName || "Shop Logo"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {logoUrl && (
                    <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-xs" title="Custom Logo Active">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                {/* Upload & Actions */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoFileChange}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo || isRemovingLogo}
                      className="h-9 px-3 text-xs font-medium rounded-lg"
                    >
                      <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                      {isUploadingLogo ? "Uploading to Cloud..." : "Upload Shop Logo"}
                    </Button>

                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={isUploadingLogo || isRemovingLogo}
                        className="h-9 px-3 text-xs font-medium text-neutral-500 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        {isRemovingLogo ? "Removing..." : "Remove Custom Logo"}
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    {logoUrl
                      ? "Custom logo stored securely on Cloudinary. Click remove anytime to restore the default avatar."
                      : "No custom logo uploaded yet. Showing a default geometric DiceBear avatar generated from your shop name."}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    Supports PNG, JPG, WEBP, and SVG formats up to 5MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Shop Details Form */}
          <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Store Details</CardTitle>
              <CardDescription className="text-xs">
                Basic contact information and counter details for your customers.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shop Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="shopName" className="text-xs font-medium">
                      Shop / Counter Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="shopName"
                      placeholder="e.g. Sai Xerox & Cyber Cafe"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerPhone" className="text-xs font-medium flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-neutral-500" />
                      <span>Contact Number</span>
                    </Label>
                    <Input
                      id="ownerPhone"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  {/* UPI ID */}
                  <div className="space-y-1.5">
                    <Label htmlFor="upiId" className="text-xs font-medium flex items-center gap-1.5">
                      <CreditCard className="h-3 w-3 text-neutral-500" />
                      <span>UPI ID / VPA</span>
                    </Label>
                    <Input
                      id="upiId"
                      placeholder="e.g. yourshop@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address" className="text-xs font-medium flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-neutral-500" />
                      <span>Shop Address / Landmark</span>
                    </Label>
                    <Input
                      id="address"
                      placeholder="e.g. Shop 4, College Road, Near City Library"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingProfile || !shopName.trim()}
                    className="h-9 px-4 rounded-lg text-xs font-medium shadow-2xs"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {isSavingProfile ? "Saving Details..." : "Save Profile Details"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 3. Customer Portal URL */}
          <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100">
                    Public Customer Upload Link
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md font-mono">
                    /s/{shopSlug}
                  </Badge>
                </div>
                <p className="text-xs text-neutral-500">
                  Customers scan this counter URL to drop files directly into your queue.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPortalUrl}
                  className="h-8 px-3 text-xs font-medium rounded-lg shrink-0"
                >
                  {copiedSlug ? (
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1" />
                  )}
                  {copiedSlug ? "Copied" : "Copy Link"}
                </Button>
                {shopSlug && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/s/${shopSlug}`, "_blank")}
                    className="h-8 px-2 text-xs font-medium rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                    title="Open customer portal in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SERVICES & RATE CARD                                           */}
      {/* ===================================================================== */}
      {activeTab === "services" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Black & White Settings */}
            <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span>Black & White Printing</span>
                  </CardTitle>
                  <Switch checked={isBwEnabled} onCheckedChange={(val) => dispatch(setBwEnabled(val))} />
                </div>
                <CardDescription className="text-xs">
                  Monochrome printing rates per sheet or side
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Single-Sided (₹)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={bwSinglePrice}
                      onChange={(e) => dispatch(setBwSinglePrice(e.target.value))}
                      disabled={!isBwEnabled}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Double-Sided (₹/side)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={bwDoublePrice}
                      onChange={(e) => dispatch(setBwDoublePrice(e.target.value))}
                      disabled={!isBwEnabled}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Color Settings */}
            <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl">
              <CardHeader className="pb-2.5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <span>Color Printing</span>
                  </CardTitle>
                  <Switch checked={isColorEnabled} onCheckedChange={(val) => dispatch(setColorEnabled(val))} />
                </div>
                <CardDescription className="text-xs">
                  Enable or disable color printing options
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Single-Sided (₹)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={colorSinglePrice}
                      onChange={(e) => dispatch(setColorSinglePrice(e.target.value))}
                      disabled={!isColorEnabled}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Double-Sided (₹/side)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={colorDoublePrice}
                      onChange={(e) => dispatch(setColorDoublePrice(e.target.value))}
                      disabled={!isColorEnabled}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Duplex Capability */}
            <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs md:col-span-2 rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-neutral-500" />
                    <Label className="text-sm font-medium">Double-Sided Printing</Label>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Allow customers to choose double-sided prints.
                  </p>
                </div>
                <Switch checked={isDuplexEnabled} onCheckedChange={(val) => dispatch(setDuplexEnabled(val))} />
              </CardContent>
            </Card>
          </div>

          {/* Save Rates Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveCatalog}
              disabled={isSavingCatalog}
              className="h-9 px-4 rounded-lg text-xs font-medium shadow-2xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSavingCatalog ? "Saving..." : "Save Rate Card"}
            </Button>
          </div>

          <Separator className="bg-neutral-200 dark:bg-neutral-800 my-4" />

          {/* 4. Custom Add-ons Manager */}
          <Card className="border border-neutral-200 dark:border-neutral-800 shadow-2xs rounded-xl">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm font-semibold">Extra Services & Add-ons</CardTitle>
              <CardDescription className="text-xs">
                Optional services like binding, lamination, or stapling
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Active Addons List */}
              <div className="space-y-1.5">
                {addons.length === 0 ? (
                  <p className="text-xs text-neutral-400">No extra add-on services configured.</p>
                ) : (
                  addons.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40"
                    >
                      <span className="font-medium text-xs text-neutral-900 dark:text-neutral-100">
                        {a.name}
                      </span>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-medium text-xs rounded-md">
                          +₹{a.price}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAddon(a.id, a.name)}
                          className="h-7 w-7 rounded-md text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Service Form */}
              <form onSubmit={handleAddAddon} className="flex flex-col sm:flex-row gap-2 pt-1">
                <Input
                  placeholder="e.g. Spiral Binding"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                  className="h-9 text-xs rounded-lg flex-1"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="₹ Price"
                    step="1"
                    value={newAddonPrice}
                    onChange={(e) => setNewAddonPrice(e.target.value)}
                    className="h-9 text-xs rounded-lg w-24 text-right"
                  />
                  <Button
                    type="submit"
                    disabled={isAddingAddon || !newAddonName.trim() || !newAddonPrice}
                    className="h-9 px-3 rounded-lg text-xs font-medium shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Service
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
