import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: vi.fn(() => (config: unknown) => config),
}));
vi.mock("../server/auth-abuse", () => ({ enforceAuthRateLimit: vi.fn() }));
vi.mock("../server/checkout.server", () => ({ createCheckoutOrderData: vi.fn() }));
vi.mock("../server/shipping.functions", () => ({
  getRajaOngkirShippingCosts: vi.fn(),
  searchRajaOngkirDestinations: vi.fn(),
}));
vi.mock("../db", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { prisma } from "../db";
import { createCheckoutOrderData } from "../server/checkout.server";
import { enforceAuthRateLimit } from "../server/auth-abuse";
import { getRajaOngkirShippingCosts, searchRajaOngkirDestinations } from "../server/shipping.functions";
import { Route as CheckoutRoute } from "./api.checkout";
import { Route as HealthRoute } from "./api.health";
import { Route as CostsRoute } from "./api.shipping.costs";
import { Route as DestinationsRoute } from "./api.shipping.destinations";

const prismaAny = prisma as any;
const checkoutPost = (CheckoutRoute as any).server.handlers.POST;
const costsPost = (CostsRoute as any).server.handlers.POST;
const destinationsPost = (DestinationsRoute as any).server.handlers.POST;
const healthGet = (HealthRoute as any).server.handlers.GET;

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api", { method: "POST", body: JSON.stringify(body) });
}

async function json(response: Response) {
  return response.json() as Promise<any>;
}

describe("API route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAKASIR_PROJECT_SLUG = "test-project";
    process.env.PAKASIR_API_KEY = "test-pakasir-key";
    process.env.RAJAONGKIR_API_KEY = "test-rajaongkir-key";
    vi.mocked(enforceAuthRateLimit).mockResolvedValue(undefined as never);
    vi.mocked(createCheckoutOrderData).mockResolvedValue({ orderNumber: "TL1", paymentUrl: "https://pay.test", total: 36000 } as never);
    vi.mocked(getRajaOngkirShippingCosts).mockResolvedValue({ weightGram: 1000, options: [] } as never);
    vi.mocked(searchRajaOngkirDestinations).mockResolvedValue([{ id: "dest-1", label: "Jakarta" }] as never);
    vi.mocked(prismaAny.$queryRaw).mockResolvedValue([{ ok: 1 }]);
  });

  it("api.checkout validates body, rate limits, and returns checkout JSON", async () => {
    const response = await checkoutPost({
      request: jsonRequest({
        tenantSlug: "kopi-ibu",
        items: [{ productId: "11111111-1111-4111-8111-111111111111", variantOptionIds: [], qty: 1 }],
        customer: {
          name: "Budi",
          whatsapp: "6281234567890",
          address: "Jl. Melati 1",
          rajaOngkirDestinationId: "dest-1",
        },
        shipping: { courier: "jne", service: "REG", cost: 12000 },
      }),
    });

    expect(response.status).toBe(200);
    await expect(json(response)).resolves.toMatchObject({ orderNumber: "TL1", total: 36000 });
    expect(enforceAuthRateLimit).toHaveBeenCalledWith({ event: "checkout", request: expect.any(Request) });
    expect(createCheckoutOrderData).toHaveBeenCalled();
  });

  it("api.checkout returns 400 message on validation failure", async () => {
    const response = await checkoutPost({ request: jsonRequest({ tenantSlug: "x" }) });

    expect(response.status).toBe(400);
    await expect(json(response)).resolves.toHaveProperty("message");
    expect(createCheckoutOrderData).not.toHaveBeenCalled();
  });

  it("api.shipping.costs rate limits and returns shipping JSON", async () => {
    const response = await costsPost({ request: jsonRequest({ tenantSlug: "kopi-ibu", destinationId: "dest-1", items: [] }) });

    expect(response.status).toBe(200);
    await expect(json(response)).resolves.toMatchObject({ weightGram: 1000 });
    expect(enforceAuthRateLimit).toHaveBeenCalledWith({ event: "shipping_costs", request: expect.any(Request) });
    expect(getRajaOngkirShippingCosts).toHaveBeenCalledWith({ data: { tenantSlug: "kopi-ibu", destinationId: "dest-1", items: [] } });
  });

  it("api.shipping.destinations rate limits and returns destination JSON", async () => {
    const response = await destinationsPost({ request: jsonRequest({ search: "jak", limit: 5 }) });

    expect(response.status).toBe(200);
    await expect(json(response)).resolves.toEqual([{ id: "dest-1", label: "Jakarta" }]);
    expect(enforceAuthRateLimit).toHaveBeenCalledWith({ event: "shipping_destinations", request: expect.any(Request) });
    expect(searchRajaOngkirDestinations).toHaveBeenCalledWith({ data: { search: "jak", limit: 5 } });
  });

  it("api.health returns no-store 200 when DB and env are ready", async () => {
    const response = await healthGet();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(json(response)).resolves.toMatchObject({ ok: true, checks: { db: "ok", env: "ok", storage: "configured" } });
  });

  it("api.health returns 503 when DB fails", async () => {
    vi.mocked(prismaAny.$queryRaw).mockRejectedValueOnce(new Error("db down"));

    const response = await healthGet();

    expect(response.status).toBe(503);
    await expect(json(response)).resolves.toMatchObject({ ok: false, checks: { db: "error" } });
  });
});
