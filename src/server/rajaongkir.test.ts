import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateDomesticCost, searchDomesticDestination, trackWaybill } from "./rajaongkir";
import { calculateShippingWeightGram } from "./shipping.functions";

const originalEnv = process.env;

describe("rajaongkir client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      RAJAONGKIR_API_KEY: "secret-key",
      RAJAONGKIR_BASE_URL: "https://rajaongkir.test/api/v1",
    };
    global.fetch = vi.fn(async () => Response.json({ data: [] })) as any;
  });

  it("searches domestic destination with API key server-side", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        data: [
          {
            id: 68423,
            province_name: "DKI Jakarta",
            city_name: "Jakarta Selatan",
            district_name: "Kebayoran Baru",
            subdistrict_name: "Senayan",
            zip_code: "12190",
          },
        ],
      }),
    );

    await expect(searchDomesticDestination("senayan", 5)).resolves.toEqual([
      expect.objectContaining({
        id: "68423",
        label: "Senayan, Kebayoran Baru, Jakarta Selatan, DKI Jakarta, 12190",
      }),
    ]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "/destination/domestic-destination?search=senayan&limit=5&offset=0",
    );
    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual(
      expect.objectContaining({ headers: { key: "secret-key" } }),
    );
  });

  it("calculates domestic costs with courier list and minimum weight", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: [{ code: "jne", service: "REG", cost: 18000, etd: "1-2 hari" }] }),
    );

    await expect(
      calculateDomesticCost({
        origin: "31555",
        destination: "68423",
        weight: 0,
        couriers: ["jne", "jnt"],
      }),
    ).resolves.toEqual([expect.objectContaining({ courier: "jne", service: "REG", cost: 18000 })]);

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(String(init.body)).toContain("origin=31555");
    expect(String(init.body)).toContain("destination=68423");
    expect(String(init.body)).toContain("weight=1");
    expect(String(init.body)).toContain("courier=jne%3Ajnt");
  });

  it("shows readable message when RajaOngkir data is not found", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ message: "not found" }, { status: 404 }),
    );

    await expect(searchDomesticDestination("lokasi-ngaco", 5)).rejects.toThrow(
      "Data RajaOngkir tidak ditemukan. Coba kata kunci lokasi lain.",
    );
  });

  it("tracks waybill when endpoint is available", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: { summary: { status: "DELIVERED", delivered: true } } }),
    );

    await expect(trackWaybill("jne", "ABC12345")).resolves.toMatchObject({
      courier: "jne",
      trackingNumber: "ABC12345",
      status: "DELIVERED",
      delivered: true,
    });
  });

  it("calculates shipment weight from product snapshots", () => {
    expect(
      calculateShippingWeightGram([
        { weightGram: 250, qty: 2 },
        { weightGram: 0, qty: 3 },
      ]),
    ).toBe(503);
  });
});
