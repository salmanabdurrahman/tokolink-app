import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RajaOngkirLocationPicker } from "./rajaongkir-location-picker";

function mockFetchByUrl(handlers: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    for (const [match, body] of Object.entries(handlers)) {
      if (url.includes(match)) return Response.json(body);
    }
    void init;
    return Response.json({ message: "not found" }, { status: 404 });
  });
}

describe("RajaOngkirLocationPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("walks provinsi -> kabupaten/kota -> kecamatan -> kelurahan and reports the final destination", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchByUrl({
        "/api/shipping/provinces": [{ id: "6", name: "JAWA BARAT", zipCode: "" }],
        "/api/shipping/cities": [{ id: "23", name: "KARAWANG", zipCode: "" }],
        "/api/shipping/districts": [{ id: "575", name: "KARAWANG TIMUR", zipCode: "" }],
        "/api/shipping/subdistricts": [{ id: "37965", name: "KARAWANG WETAN", zipCode: "41314" }],
      }),
    );
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RajaOngkirLocationPicker value={null} onChange={onChange} />);

    await screen.findByRole("option", { name: "JAWA BARAT" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Provinsi" }), "6");

    await screen.findByRole("option", { name: "KARAWANG" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Kabupaten/Kota" }), "23");

    await screen.findByRole("option", { name: "KARAWANG TIMUR" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Kecamatan" }), "575");

    await screen.findByRole("option", { name: "KARAWANG WETAN" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Kelurahan/Desa" }), "37965");

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: "37965",
          provinceName: "JAWA BARAT",
          cityName: "KARAWANG",
          districtName: "KARAWANG TIMUR",
          subdistrictName: "KARAWANG WETAN",
          zipCode: "41314",
        }),
      ),
    );
  });

  it("finalizes at district level when a district has no registered kelurahan/desa", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchByUrl({
        "/api/shipping/provinces": [{ id: "6", name: "JAWA BARAT", zipCode: "" }],
        "/api/shipping/cities": [{ id: "23", name: "KARAWANG", zipCode: "" }],
        "/api/shipping/districts": [{ id: "575", name: "KARAWANG TIMUR", zipCode: "41314" }],
        "/api/shipping/subdistricts": [],
      }),
    );
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RajaOngkirLocationPicker value={null} onChange={onChange} />);

    await screen.findByRole("option", { name: "JAWA BARAT" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Provinsi" }), "6");
    await screen.findByRole("option", { name: "KARAWANG" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Kabupaten/Kota" }), "23");
    await screen.findByRole("option", { name: "KARAWANG TIMUR" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Kecamatan" }), "575");

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "575", districtName: "KARAWANG TIMUR", subdistrictName: "" }),
      ),
    );
  });

  it("supports the quick search fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/shipping/provinces")) return Response.json([]);
        if (url.includes("/api/shipping/destinations")) {
          void init;
          return Response.json([
            {
              id: "dest-1",
              label: "Senayan, Jakarta Selatan",
              provinceName: "DKI Jakarta",
              cityName: "Jakarta Selatan",
              districtName: "Kebayoran Baru",
              subdistrictName: "Senayan",
              zipCode: "12110",
            },
          ]);
        }
        return Response.json({ message: "not found" }, { status: 404 });
      }),
    );
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RajaOngkirLocationPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Cari cepat" }));
    await user.type(screen.getByPlaceholderText("Cari kecamatan/kelurahan"), "senayan");
    await user.click(screen.getByRole("button", { name: "Cari" }));

    const result = await screen.findByRole("button", { name: "Senayan, Jakarta Selatan" });
    await user.click(result);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dest-1", label: "Senayan, Jakarta Selatan" }),
    );
  });

  it("blocks the quick search with a readable toast instead of hitting the API with a too-short query", async () => {
    const { toast } = await import("sonner");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/shipping/provinces")) return Response.json([]);
        throw new Error("should not call the API for a too-short query");
      }),
    );
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<RajaOngkirLocationPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Cari cepat" }));
    await user.type(screen.getByPlaceholderText("Cari kecamatan/kelurahan"), "ja");
    await user.click(screen.getByRole("button", { name: "Cari" }));

    expect(toast.error).toHaveBeenCalledWith("Ketik minimal 3 karakter lokasi");
    expect(onChange).not.toHaveBeenCalled();
  });
});
