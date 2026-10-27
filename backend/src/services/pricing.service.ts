import type { ShopPrintSettings, ShopAddon } from "../db/schema";

export interface PrintItemQuoteRequest {
  pageCount: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  paperSize: string;
  isDuplex: boolean;
}

export interface CalculatedItemQuote {
  ratePerUnit: number;
  pageCount: number;
  copies: number;
  colorMode: "BW" | "COLOR";
  isDuplex: boolean;
  itemTotal: number;
}

export interface CalculatedOrderQuote {
  items: CalculatedItemQuote[];
  addons: { id: string; name: string; price: number }[];
  subtotalItems: number;
  subtotalAddons: number;
  totalAmount: number;
}

export function calculateOrderQuote(
  settings: ShopPrintSettings,
  availableAddons: ShopAddon[],
  items: PrintItemQuoteRequest[],
  selectedAddonIds: string[] = []
): CalculatedOrderQuote {
  const calculatedItems: CalculatedItemQuote[] = [];
  let subtotalItems = 0;

  for (const item of items) {
    if (item.copies < 1) {
      throw new Error("Number of copies must be at least 1.");
    }
    if (item.pageCount < 1) {
      throw new Error("Page count must be at least 1.");
    }

    // Verify shop capability
    if (item.colorMode === "COLOR" && !settings.isColorEnabled) {
      throw new Error("Color printing is currently not offered at this shop.");
    }
    if (item.isDuplex && !settings.isDuplexEnabled) {
      throw new Error("Double-sided printing is currently not offered at this shop.");
    }

    // Determine applicable rate
    let ratePerUnit = 0;
    if (item.colorMode === "COLOR") {
      ratePerUnit = item.isDuplex
        ? Number(settings.colorDoublePrice)
        : Number(settings.colorSinglePrice);
    } else {
      ratePerUnit = item.isDuplex
        ? Number(settings.bwDoublePrice)
        : Number(settings.bwSinglePrice);
    }

    const itemTotal = Number((ratePerUnit * item.pageCount * item.copies).toFixed(2));
    subtotalItems += itemTotal;

    calculatedItems.push({
      ratePerUnit,
      pageCount: item.pageCount,
      copies: item.copies,
      colorMode: item.colorMode,
      isDuplex: item.isDuplex,
      itemTotal,
    });
  }

  // Calculate selected add-ons
  const calculatedAddons: { id: string; name: string; price: number }[] = [];
  let subtotalAddons = 0;

  for (const addonId of selectedAddonIds) {
    const addon = availableAddons.find((a) => a.id === addonId && a.isActive);
    if (addon) {
      const price = Number(addon.price);
      subtotalAddons += price;
      calculatedAddons.push({
        id: addon.id,
        name: addon.name,
        price,
      });
    }
  }

  const totalAmount = Number((subtotalItems + subtotalAddons).toFixed(2));

  return {
    items: calculatedItems,
    addons: calculatedAddons,
    subtotalItems: Number(subtotalItems.toFixed(2)),
    subtotalAddons: Number(subtotalAddons.toFixed(2)),
    totalAmount,
  };
}

