import { describe, expect, it } from "vitest";
import {
  createLinkSchema,
  createProductSchema,
  createTenantSchema,
  productVariantGroupSchema,
  productVariantOptionSchema,
  tenantSlugSchema,
} from "./schemas";

const expectValid = (
  value: unknown,
  schema: { safeParse: (value: unknown) => { success: boolean } },
) => {
  expect(schema.safeParse(value).success).toBe(true);
};

const expectInvalid = (
  value: unknown,
  schema: { safeParse: (value: unknown) => { success: boolean } },
) => {
  expect(schema.safeParse(value).success).toBe(false);
};

describe("schemas", () => {
  it("validates tenant slugs and tenant payload defaults", () => {
    expectValid("toko-123", tenantSlugSchema);
    expectInvalid("ab", tenantSlugSchema);
    expectInvalid("Toko", tenantSlugSchema);
    expectInvalid("toko_slug", tenantSlugSchema);

    const parsed = createTenantSchema.parse({
      slug: "toko-123",
      name: "Toko Saya",
      turnstileToken: "human-token",
    });

    expect(parsed.tagline).toBe("");
    expect(parsed.avatar).toBe("");
    expect(parsed.whatsapp).toBe("");
  });

  it("validates product and variant payloads", () => {
    expectValid(
      {
        name: "Kopi Susu",
        basePrice: 15000,
        variantGroups: [{ name: "Ukuran", options: [{ name: "Large", priceDelta: 3000 }] }],
      },
      createProductSchema,
    );
    expectInvalid({ name: "", basePrice: 15000 }, createProductSchema);
    expectInvalid({ name: "Kopi", basePrice: -1 }, createProductSchema);
    expectInvalid({ name: "Ukuran", options: [] }, productVariantGroupSchema);
    expectInvalid({ name: "Large", priceDelta: -1 }, productVariantOptionSchema);
  });

  it("validates link payloads", () => {
    expectValid({ label: "Instagram", url: "https://instagram.com/tokolink" }, createLinkSchema);
    expectValid({ label: "Coming Soon", url: "#" }, createLinkSchema);
    expectInvalid({ label: "", url: "https://example.com" }, createLinkSchema);
    expectInvalid({ label: "Website", url: "not-a-url" }, createLinkSchema);
  });
});
