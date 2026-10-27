import { describe, expect, it } from "bun:test";
import { calculateOrderQuote } from "../pricing.service";
import type { ShopPrintSettings, ShopAddon } from "../../db/schema";

const mockSettings: ShopPrintSettings = {
  id: "setting-1",
  shopId: "shop-1",
  isBwEnabled: true,
  bwSinglePrice: "2.00",
  bwDoublePrice: "1.50",
  isColorEnabled: true,
  colorSinglePrice: "10.00",
  colorDoublePrice: "8.00",
  isDuplexEnabled: true,
  supportedPaperSizes: ["A4", "LEGAL"],
  updatedAt: new Date(),
};

const mockAddons: ShopAddon[] = [
  {
    id: "addon-spiral",
    shopId: "shop-1",
    name: "Spiral Binding",
    type: "BINDING",
    price: "35.00",
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "addon-lamination",
    shopId: "shop-1",
    name: "A4 Lamination",
    type: "LAMINATION",
    price: "20.00",
    isActive: false, // inactive
    createdAt: new Date(),
  },
];

describe("Pricing Service", () => {
  it("correctly calculates B&W single-sided print quote", () => {
    const quote = calculateOrderQuote(
      mockSettings,
      mockAddons,
      [
        {
          pageCount: 10,
          copies: 1,
          colorMode: "BW",
          paperSize: "A4",
          isDuplex: false,
        },
      ]
    );

    expect(quote.totalAmount).toBe(20.0); // 10 pages * ₹2.00
    expect(quote.subtotalAddons).toBe(0);
    expect(quote.items[0]?.ratePerUnit).toBe(2.0);
  });

  it("correctly calculates B&W double-sided (duplex) print quote", () => {
    const quote = calculateOrderQuote(
      mockSettings,
      mockAddons,
      [
        {
          pageCount: 10,
          copies: 2,
          colorMode: "BW",
          paperSize: "A4",
          isDuplex: true,
        },
      ]
    );

    // 10 pages * 2 copies * ₹1.50 = ₹30.00
    expect(quote.totalAmount).toBe(30.0);
    expect(quote.items[0]?.ratePerUnit).toBe(1.5);
  });

  it("calculates multi-item quote with Add-on (Spiral Binding)", () => {
    const quote = calculateOrderQuote(
      mockSettings,
      mockAddons,
      [
        {
          pageCount: 5,
          copies: 1,
          colorMode: "COLOR",
          paperSize: "A4",
          isDuplex: false,
        },
      ],
      ["addon-spiral"]
    );

    // Color: 5 * 10 = ₹50
    // Spiral: ₹35
    // Total = ₹85
    expect(quote.subtotalItems).toBe(50.0);
    expect(quote.subtotalAddons).toBe(35.0);
    expect(quote.totalAmount).toBe(85.0);
  });

  it("ignores inactive add-ons", () => {
    const quote = calculateOrderQuote(
      mockSettings,
      mockAddons,
      [
        {
          pageCount: 2,
          copies: 1,
          colorMode: "BW",
          paperSize: "A4",
          isDuplex: false,
        },
      ],
      ["addon-lamination"] // this one is isActive: false
    );

    expect(quote.subtotalAddons).toBe(0);
    expect(quote.totalAmount).toBe(4.0);
  });

  it("throws error if color requested when disabled", () => {
    const bwOnlySettings: ShopPrintSettings = {
      ...mockSettings,
      isColorEnabled: false,
    };

    expect(() =>
      calculateOrderQuote(bwOnlySettings, mockAddons, [
        {
          pageCount: 5,
          copies: 1,
          colorMode: "COLOR",
          paperSize: "A4",
          isDuplex: false,
        },
      ])
    ).toThrow("Color printing is currently not offered at this shop.");
  });

  it("throws error if duplex requested when disabled", () => {
    const singleOnlySettings: ShopPrintSettings = {
      ...mockSettings,
      isDuplexEnabled: false,
    };

    expect(() =>
      calculateOrderQuote(singleOnlySettings, mockAddons, [
        {
          pageCount: 5,
          copies: 1,
          colorMode: "BW",
          paperSize: "A4",
          isDuplex: true,
        },
      ])
    ).toThrow("Double-sided printing is currently not offered at this shop.");
  });
});

