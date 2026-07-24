import { describe, expect, it } from "vitest";
import {
  makeCartItem,
  makeLink,
  makeProduct,
  makeTenant,
  makeUser,
  makeVariantGroup,
  makeVariantOption,
} from "./factories";

describe("test factories", () => {
  it("creates consistent default data for core app layers", () => {
    const user = makeUser();
    const tenant = makeTenant();
    const product = makeProduct();
    const link = makeLink();
    const variantGroup = makeVariantGroup();
    const variantOption = makeVariantOption();
    const cartItem = makeCartItem();

    expect(user.email).toBe("owner@example.com");
    expect(tenant.products).toHaveLength(1);
    expect(product.variantGroups).toHaveLength(1);
    expect(link.url).toContain("instagram.com");
    expect(variantGroup.options).toHaveLength(1);
    expect(variantOption.priceDelta).toBe(0);
    expect(cartItem.unitPrice * cartItem.qty).toBe(25000);
  });
});
