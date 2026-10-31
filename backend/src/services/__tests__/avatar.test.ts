import { describe, it, expect } from "bun:test";
import { getShopAvatarUrl } from "../../utils/avatar";

describe("Shop Avatar Utility", () => {
  it("returns custom logo URL if provided", () => {
    const customUrl = "https://res.cloudinary.com/kagaz/image/upload/v12345/shop.png";
    expect(getShopAvatarUrl("Sai Xerox", customUrl)).toBe(customUrl);
  });

  it("returns DiceBear avatar when custom logo is null or undefined", () => {
    const avatar = getShopAvatarUrl("Sai Xerox", null);
    expect(avatar).toContain("api.dicebear.com/9.x/shapes/svg?seed=Sai%20Xerox");
  });

  it("returns DiceBear avatar with fallback seed if name is empty", () => {
    const avatar = getShopAvatarUrl("", null);
    expect(avatar).toContain("api.dicebear.com/9.x/shapes/svg?seed=Kagaz");
  });

  it("trims whitespace from shop name in seed", () => {
    const avatar = getShopAvatarUrl("  Metro Prints  ", undefined);
    expect(avatar).toContain("seed=Metro%20Prints");
  });
});

