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

export default function DashboardSettingsPage() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const {
    isBwEnabled,
    bwSinglePrice,
    bwDoublePrice,
    isColorEnabled,
    colorSinglePrice,
    colorDoublePrice,
    isDuplexEnabled,
    addons,
    isLoading,
    isSaving,
  } = useAppSelector((state) => state.catalog);

  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [isAddingAddon, setIsAddingAddon] = useState(false);

  useEffect(() => {
    if (token) {
      dispatch(fetchCatalogSettings(token));
    }
  }, [token, dispatch]);

  const handleSaveSettings = async () => {
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 border-4 border-neutral-300 border-t-primary rounded-full animate-spin mb-2" />
        <p className="text-xs text-neutral-500">Loading catalog settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Services & Rate Card
        </h1>
        <p className="text-xs text-neutral-500">
          Configure rates and print options for walk-in customers.
        </p>
      </div>

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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="h-9 px-4 rounded-lg text-xs font-medium shadow-2xs"
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {isSaving ? "Saving..." : "Save Rate Card"}
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
                Add service
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

