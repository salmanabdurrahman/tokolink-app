import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Select } from "./select";

describe("Select", () => {
  it("renders options and forwards value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Select aria-label="Kategori" onChange={onChange}>
        <option value="link">Link</option>
        <option value="produk">Produk</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Kategori" }) as HTMLSelectElement;
    await user.selectOptions(select, "produk");

    expect(select.value).toBe("produk");
    expect(onChange).toHaveBeenCalled();
  });

  it("applies disabled state", () => {
    render(
      <Select aria-label="Kategori" disabled>
        <option value="link">Link</option>
      </Select>,
    );

    expect(screen.getByRole("combobox", { name: "Kategori" })).toBeDisabled();
  });

  it("merges custom className with base styles", () => {
    render(
      <Select aria-label="Kategori" className="custom-select">
        <option value="link">Link</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Kategori" });
    expect(select.className).toContain("custom-select");
    expect(select.className).toContain("rounded-xl");
  });

  it("forwards ref to the underlying select element", () => {
    const ref = { current: null as HTMLSelectElement | null };

    render(
      <Select ref={ref} aria-label="Kategori">
        <option value="link">Link</option>
      </Select>,
    );

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });
});
