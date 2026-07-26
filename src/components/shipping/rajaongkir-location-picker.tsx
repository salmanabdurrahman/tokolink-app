import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type RajaOngkirLocationValue = {
  id: string;
  label: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  subdistrictName: string;
  zipCode: string;
};

type LocationOption = { id: string; name: string; zipCode: string };

interface RajaOngkirLocationPickerProps {
  value: RajaOngkirLocationValue | null;
  onChange: (value: RajaOngkirLocationValue | null) => void;
  quickSearchPlaceholder?: string;
  quickSearchLabel?: string;
  provinceLabel?: string;
  cityLabel?: string;
  districtLabel?: string;
  subdistrictLabel?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || "Gagal memuat data lokasi. Coba lagi.");
  }
  return result as T;
}

function buildDistrictLevelValue(
  province: LocationOption,
  city: LocationOption,
  district: LocationOption,
): RajaOngkirLocationValue {
  return {
    id: district.id,
    label: [district.name, city.name, province.name, district.zipCode].filter(Boolean).join(", "),
    provinceName: province.name,
    cityName: city.name,
    districtName: district.name,
    subdistrictName: "",
    zipCode: district.zipCode,
  };
}

function buildSubdistrictLevelValue(
  province: LocationOption,
  city: LocationOption,
  district: LocationOption,
  subdistrict: LocationOption,
): RajaOngkirLocationValue {
  return {
    id: subdistrict.id,
    label: [subdistrict.name, district.name, city.name, province.name, subdistrict.zipCode]
      .filter(Boolean)
      .join(", "),
    provinceName: province.name,
    cityName: city.name,
    districtName: district.name,
    subdistrictName: subdistrict.name,
    zipCode: subdistrict.zipCode,
  };
}

/**
 * Cascading provinsi -> kabupaten/kota -> kecamatan -> kelurahan/desa
 * location picker for RajaOngkir origin/destination, with a free-text
 * quick search fallback for users who already know their kecamatan.
 */
export function RajaOngkirLocationPicker({
  value,
  onChange,
  quickSearchPlaceholder = "Cari kecamatan/kelurahan",
  quickSearchLabel = "Cari lokasi",
  provinceLabel = "Provinsi",
  cityLabel = "Kabupaten/Kota",
  districtLabel = "Kecamatan",
  subdistrictLabel = "Kelurahan/Desa",
}: RajaOngkirLocationPickerProps) {
  const [mode, setMode] = useState<"cascade" | "search">("cascade");

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [subdistricts, setSubdistricts] = useState<LocationOption[]>([]);

  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subdistrictId, setSubdistrictId] = useState("");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingSubdistricts, setLoadingSubdistricts] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RajaOngkirLocationValue[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    fetchJson<LocationOption[]>("/api/shipping/provinces")
      .then((result) => {
        if (!cancelled) setProvinces(result);
      })
      .catch((error) => {
        if (!cancelled)
          toast.error(
            error instanceof Error ? error.message : "Gagal memuat daftar provinsi. Coba lagi.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProvinceChange = async (nextProvinceId: string) => {
    setProvinceId(nextProvinceId);
    setCityId("");
    setDistrictId("");
    setSubdistrictId("");
    setCities([]);
    setDistricts([]);
    setSubdistricts([]);
    onChange(null);
    if (!nextProvinceId) return;

    try {
      setLoadingCities(true);
      const result = await fetchJson<LocationOption[]>(
        `/api/shipping/cities?provinceId=${encodeURIComponent(nextProvinceId)}`,
      );
      setCities(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat daftar kabupaten/kota. Coba lagi.",
      );
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCityChange = async (nextCityId: string) => {
    setCityId(nextCityId);
    setDistrictId("");
    setSubdistrictId("");
    setDistricts([]);
    setSubdistricts([]);
    onChange(null);
    if (!nextCityId) return;

    try {
      setLoadingDistricts(true);
      const result = await fetchJson<LocationOption[]>(
        `/api/shipping/districts?cityId=${encodeURIComponent(nextCityId)}`,
      );
      setDistricts(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat daftar kecamatan. Coba lagi.",
      );
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleDistrictChange = async (nextDistrictId: string) => {
    setDistrictId(nextDistrictId);
    setSubdistrictId("");
    setSubdistricts([]);
    onChange(null);
    if (!nextDistrictId) return;

    const province = provinces.find((item) => item.id === provinceId);
    const city = cities.find((item) => item.id === cityId);
    const district = districts.find((item) => item.id === nextDistrictId);
    if (!province || !city || !district) return;

    try {
      setLoadingSubdistricts(true);
      const result = await fetchJson<LocationOption[]>(
        `/api/shipping/subdistricts?districtId=${encodeURIComponent(nextDistrictId)}`,
      );
      setSubdistricts(result);
      // Some districts have no registered kelurahan/desa; district id is a
      // valid RajaOngkir destination on its own, so finalize right away
      // instead of leaving the picker stuck waiting for a 4th level.
      if (!result.length) {
        onChange(buildDistrictLevelValue(province, city, district));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat daftar kelurahan/desa. Coba lagi.",
      );
    } finally {
      setLoadingSubdistricts(false);
    }
  };

  const handleSubdistrictChange = (nextSubdistrictId: string) => {
    setSubdistrictId(nextSubdistrictId);
    if (!nextSubdistrictId) {
      onChange(null);
      return;
    }

    const province = provinces.find((item) => item.id === provinceId);
    const city = cities.find((item) => item.id === cityId);
    const district = districts.find((item) => item.id === districtId);
    const subdistrict = subdistricts.find((item) => item.id === nextSubdistrictId);
    if (!province || !city || !district || !subdistrict) return;

    onChange(buildSubdistrictLevelValue(province, city, district, subdistrict));
  };

  const runQuickSearch = async () => {
    if (searchQuery.trim().length < 3) {
      toast.error("Ketik minimal 3 karakter lokasi");
      return;
    }
    try {
      setSearching(true);
      const response = await fetch("/api/shipping/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: searchQuery, limit: 5 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Gagal mencari lokasi. Coba lagi.");
      setSearchResults(result);
      if (!result.length) toast.error("Lokasi tidak ditemukan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mencari lokasi. Coba lagi.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full border border-border bg-surface p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("cascade")}
          className={`rounded-full px-3 py-1.5 font-medium transition ${mode === "cascade" ? "bg-foreground text-background" : "text-muted-foreground"}`}
        >
          Pilih dari daftar
        </button>
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`rounded-full px-3 py-1.5 font-medium transition ${mode === "search" ? "bg-foreground text-background" : "text-muted-foreground"}`}
        >
          Cari cepat
        </button>
      </div>

      {mode === "cascade" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={provinceLabel}>
            <Select
              value={provinceId}
              disabled={loadingProvinces}
              onChange={(e) => handleProvinceChange(e.target.value)}
            >
              <option value="">
                {loadingProvinces ? "Memuat daftar provinsi..." : "Pilih provinsi"}
              </option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={cityLabel}>
            <Select
              value={cityId}
              disabled={!provinceId || loadingCities}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="">
                {!provinceId
                  ? "Pilih provinsi dulu"
                  : loadingCities
                    ? "Memuat daftar kabupaten/kota..."
                    : "Pilih kabupaten/kota"}
              </option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={districtLabel}>
            <Select
              value={districtId}
              disabled={!cityId || loadingDistricts}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              <option value="">
                {!cityId
                  ? "Pilih kabupaten/kota dulu"
                  : loadingDistricts
                    ? "Memuat daftar kecamatan..."
                    : "Pilih kecamatan"}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={subdistrictLabel}>
            <Select
              value={subdistrictId}
              disabled={!districtId || loadingSubdistricts || subdistricts.length === 0}
              onChange={(e) => handleSubdistrictChange(e.target.value)}
            >
              <option value="">
                {!districtId
                  ? "Pilih kecamatan dulu"
                  : loadingSubdistricts
                    ? "Memuat daftar kelurahan/desa..."
                    : subdistricts.length === 0
                      ? "Tidak tersedia, kecamatan ini otomatis dipakai"
                      : "Pilih kelurahan/desa"}
              </option>
              {subdistricts.map((subdistrict) => (
                <option key={subdistrict.id} value={subdistrict.id}>
                  {subdistrict.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{quickSearchLabel}</Label>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={quickSearchPlaceholder}
            />
            <Button type="button" variant="outline" disabled={searching} onClick={runQuickSearch}>
              {searching ? "Cari..." : "Cari"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="grid gap-2">
              {searchResults.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setSearchResults([]);
                    setSearchQuery(option.label);
                  }}
                  className="rounded-xl border border-border p-3 text-left text-sm hover:bg-surface transition"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="rounded-xl bg-surface p-3 text-sm">
          <div className="text-xs text-muted-foreground">Lokasi terpilih</div>
          <div className="mt-1 font-medium">{value.label}</div>
          <div className="mt-1 text-xs text-muted-foreground">Kode wilayah: {value.id}</div>
        </div>
      )}
    </div>
  );
}
