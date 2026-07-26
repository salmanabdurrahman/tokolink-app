import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __clearRajaOngkirCostCacheForTests,
  calculateDomesticCost,
  listCities,
  listDistricts,
  listProvinces,
  listSubdistricts,
  searchDomesticDestination,
  trackWaybill,
} from "./rajaongkir";
import { calculateShippingWeightGram } from "./shipping.functions";

const originalEnv = process.env;

describe("rajaongkir client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __clearRajaOngkirCostCacheForTests();
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

  it("maps RajaOngkir auth, rate limit, and server errors", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({}, { status: 401 }))
      .mockResolvedValueOnce(Response.json({}, { status: 429 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }));

    await expect(searchDomesticDestination("senayan", 5)).rejects.toThrow(
      "Kunci API RajaOngkir tidak valid. Hubungi admin toko.",
    );
    await expect(searchDomesticDestination("senayan", 5)).rejects.toThrow(
      "Terlalu banyak request ke RajaOngkir. Tunggu sebentar lalu coba lagi.",
    );
    await expect(searchDomesticDestination("senayan", 5)).rejects.toThrow(
      "Layanan RajaOngkir sedang bermasalah. Coba lagi beberapa saat lagi.",
    );
  });

  it("lists provinces for the step-by-step picker", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: [{ id: 6, name: "JAWA BARAT" }] }),
    );

    await expect(listProvinces()).resolves.toEqual([
      expect.objectContaining({ id: "6", name: "JAWA BARAT" }),
    ]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/destination/province");
  });

  it("lists cities within a province by id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: [{ id: 23, name: "KARAWANG", zip_code: "41311" }] }),
    );

    await expect(listCities("6")).resolves.toEqual([
      expect.objectContaining({ id: "23", name: "KARAWANG", zipCode: "41311" }),
    ]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/destination/city/6");
  });

  it("lists districts within a city by id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: [{ id: 575, name: "KARAWANG TIMUR", zip_code: "41314" }] }),
    );

    await expect(listDistricts("23")).resolves.toEqual([
      expect.objectContaining({ id: "575", name: "KARAWANG TIMUR" }),
    ]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/destination/district/23");
  });

  it("lists subdistricts within a district by id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ data: [{ id: 37965, name: "KARAWANG WETAN", zip_code: "41314" }] }),
    );

    await expect(listSubdistricts("575")).resolves.toEqual([
      expect.objectContaining({ id: "37965", name: "KARAWANG WETAN" }),
    ]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("/destination/sub-district/575");
  });

  it("filters out location rows missing id or name", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        data: [
          { id: 1, name: "OK" },
          { id: "", name: "NO ID" },
          { id: 2, name: "" },
        ],
      }),
    );

    await expect(listProvinces()).resolves.toEqual([
      expect.objectContaining({ id: "1", name: "OK" }),
    ]);
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

  it("caches domestic cost per origin/destination/weight/courier and skips duplicate calls", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ data: [{ code: "jne", service: "REG", cost: 18000, etd: "1-2 hari" }] }),
    );

    const input = { origin: "31555", destination: "68423", weight: 1000, couriers: ["jne", "jnt"] };

    await calculateDomesticCost(input);
    await calculateDomesticCost(input);
    await calculateDomesticCost({ ...input, couriers: ["jnt", "jne"] });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("misses cache and calls RajaOngkir again for a different destination", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ data: [{ code: "jne", service: "REG", cost: 18000, etd: "1-2 hari" }] }),
    );

    await calculateDomesticCost({
      origin: "31555",
      destination: "68423",
      weight: 1000,
      couriers: ["jne"],
    });
    await calculateDomesticCost({
      origin: "31555",
      destination: "99999",
      weight: 1000,
      couriers: ["jne"],
    });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("retries once after a timeout then succeeds", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.mocked(fetch)
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(
        Response.json({ data: [{ code: "jne", service: "REG", cost: 18000, etd: "1-2 hari" }] }),
      );

    await expect(
      calculateDomesticCost({
        origin: "31555",
        destination: "68423",
        weight: 1000,
        couriers: ["jne"],
      }),
    ).resolves.toEqual([expect.objectContaining({ courier: "jne", cost: 18000 })]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after the retry limit and surfaces the timeout message", async () => {
    const abortError = new DOMException("Aborted", "AbortError");
    vi.mocked(fetch).mockRejectedValue(abortError);

    await expect(
      calculateDomesticCost({
        origin: "31555",
        destination: "68423",
        weight: 1000,
        couriers: ["jne"],
      }),
    ).rejects.toThrow("RajaOngkir terlalu lama merespons. Coba lagi.");
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed request so the next call retries fresh", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(
        Response.json({ data: [{ code: "jne", service: "REG", cost: 18000, etd: "1-2 hari" }] }),
      );

    const input = { origin: "31555", destination: "68423", weight: 1000, couriers: ["jne"] };
    await expect(calculateDomesticCost(input)).rejects.toThrow();
    await expect(calculateDomesticCost(input)).resolves.toEqual([
      expect.objectContaining({ courier: "jne", cost: 18000 }),
    ]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});
