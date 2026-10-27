"use client";

import React, { useEffect, useState } from "react";
import {
  SlidersHorizontal,
  Palette,
  Layers,
  Save,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  fetchShopMe,
  updateShopCatalog,
  addShopAddon,
  deleteShopAddon,
  fetchShopCatalog,
} from "@/lib/api";

export default function DashboardSettingsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [isBwEnabled, setIsBwEnabled] = useState(true);
  const [bwSinglePrice, setBwSinglePrice] = useState("2.00");
  const [bwDoublePrice, setBwDoublePrice] = useState("1.50");

  const [isColorEnabled, setIsColorEnabled] = useState(false);
  const [colorSinglePrice, setColorSinglePrice] = useState("10.00");
  const [colorDoublePrice, setColorDoublePrice] = useState("8.00");

  const [isDuplexEnabled, setIsDuplexEnabled] = useState(true);

  // Addons State
  const [addons, setAddons] = useState<
    { id: string; name: string; type: string; price: string }[]
  >([]);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [isAddingAddon, setIsAddingAddon] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("kagaz_shop_token");
    setToken(storedToken);

    if (storedToken) {
      fetchShopMe(storedToken)
        .then((res) => {
          const s = res.data.settings;
          const shop = res.data.shop;
          setShopSlug(shop.slug);

          if (s) {
            setIsBwEnabled(s.isBwEnabled);
            setBwSinglePrice(s.bwSinglePrice);
            setBwDoublePrice(s.bwDoublePrice);
            setIsColorEnabled(s.isColorEnabled);
            setColorSinglePrice(s.colorSinglePrice);
            setColorDoublePrice(s.colorDoublePrice);
            setIsDuplexEnabled(s.isDuplexEnabled);
          }

          // Fetch active addons from public catalog
          return fetchShopCatalog(shop.slug);
        })
        .then((catRes) => {
          setAddons(catRes.data.catalog.addons);
        })
        .catch((err) => {
          console.error("Error loading settings:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const handleSaveSettings = async () => {
    if (!token) return;
    setIsSaving(true);

    try {
      await updateShopCatalog(token, {
        isBwEnabled,
        bwSinglePrice: parseFloat(bwSinglePrice) || 2.0,
        bwDoublePrice: parseFloat(bwDoublePrice) || 1.5,
        isColorEnabled,
        colorSinglePrice: parseFloat(colorSinglePrice) || 10.0,
        colorDoublePrice: parseFloat(colorDoublePrice) || 8.0,
        isDuplexEnabled,
      });

      toast.success("Services and rates updated! Customer QR immediately updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update catalog");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newAddonName.trim() || !newAddonPrice) return;

    setIsAddingAddon(true);
    try {
      const res = await addShopAddon(token, {
        name: newAddonName.trim(),
        type: "CUSTOM",
        price: parseFloat(newAddonPrice),
      });

      setAddons((prev) => [...prev, res.data]);
      setNewAddonName("");
      setNewAddonPrice("");
      toast.success(`Added "${res.data.name}" to catalog`);
    } catch (err: any) {
      toast.error(err.message || "Failed to add service");
    } finally {
      setIsAddingAddon(false);
    }
  };

  const handleDeleteAddon = async (id: string, name: string) => {
    if (!token) return;
    try {
      await deleteShopAddon(token, id);
      setAddons((prev) => prev.filter((a) => a.id !== id));
      toast.info(`Removed "${name}" from catalog`);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove service");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
        <p className="text-xs text-neutral-500">Loading catalog settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">
          Services & Rate Card
        </h1>
        <p className="text-xs text-neutral-500">
          Control which printing capabilities are offered to walk-in customers and configure per-page rates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Black & White Settings */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Black & White Printing</span>
              </CardTitle>
              <Switch checked={isBwEnabled} onCheckedChange={setIsBwEnabled} />
            </div>
            <CardDescription className="text-xs">
              Monochrome laser printing rates per sheet or side
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Single-Sided Rate (₹)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={bwSinglePrice}
                  onChange={(e) => setBwSinglePrice(e.target.value)}
                  disabled={!isBwEnabled}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Double-Sided Rate (₹/side)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={bwDoublePrice}
                  onChange={(e) => setBwDoublePrice(e.target.value)}
                  disabled={!isBwEnabled}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Color Settings */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" />
                <span>Color Printing</span>
              </CardTitle>
              <Switch checked={isColorEnabled} onCheckedChange={setIsColorEnabled} />
            </div>
            <CardDescription className="text-xs">
              If disabled, the Color option is hidden on customer phones
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Single-Sided Rate (₹)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={colorSinglePrice}
                  onChange={(e) => setColorSinglePrice(e.target.value)}
                  disabled={!isColorEnabled}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Double-Sided Rate (₹/side)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={colorDoublePrice}
                  onChange={(e) => setColorDoublePrice(e.target.value)}
                  disabled={!isColorEnabled}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Duplex Capability */}
        <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs md:col-span-2">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-neutral-500" />
                <Label className="text-sm font-bold">Offer Double-Sided (Duplex) Printing?</Label>
              </div>
              <p className="text-xs text-neutral-500">
                Turn off if your shop only has single-sided printers.
              </p>
            </div>
            <Switch checked={isDuplexEnabled} onCheckedChange={setIsDuplexEnabled} />
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="h-10 px-6 rounded-xl text-xs font-bold shadow-sm"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {isSaving ? "Saving..." : "Save Rate Card"}
        </Button>
      </div>

      <Separator className="bg-neutral-200 dark:bg-neutral-800 my-6" />

      {/* 4. Custom Add-ons Manager */}
      <Card className="border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Extra Services & Add-ons</CardTitle>
          <CardDescription className="text-xs">
            Add custom services like Spiral Binding, A4 Lamination, or Stapling with a fixed price
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Active Addons List */}
          <div className="space-y-2">
            {addons.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No extra add-on services configured yet.</p>
            ) : (
              addons.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40"
                >
                  <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                    {a.name}
                  </span>

                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-bold text-xs">
                      +₹{a.price}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAddon(a.id, a.name)}
                      className="h-7 w-7 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add New Service Form */}
          <form onSubmit={handleAddAddon} className="flex flex-col sm:flex-row gap-2 pt-2">
            <Input
              placeholder="e.g. Spiral Binding (upto 100 pgs)"
              value={newAddonName}
              onChange={(e) => setNewAddonName(e.target.value)}
              className="h-9 text-xs flex-1"
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="₹ Price"
                step="1"
                value={newAddonPrice}
                onChange={(e) => setNewAddonPrice(e.target.value)}
                className="h-9 text-xs w-24 text-right"
              />
              <Button
                type="submit"
                disabled={isAddingAddon || !newAddonName.trim() || !newAddonPrice}
                className="h-9 px-4 rounded-lg text-xs font-bold shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Service
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

