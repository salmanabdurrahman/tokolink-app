import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomerForm, type CustomerFormValue } from "./customer-form";

const value: CustomerFormValue = { name: "", email: "", whatsapp: "", address: "" };

describe("CustomerForm", () => {
  it("calls onChange with updated name", () => {
    const onChange = vi.fn();
    render(<CustomerForm value={value} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Nama lengkap"), {
      target: { value: "Budi" },
    });

    expect(onChange).toHaveBeenCalledWith({ ...value, name: "Budi" });
  });

  it("formats whatsapp number on change", () => {
    const onChange = vi.fn();
    render(<CustomerForm value={value} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("WhatsApp, contoh 628123456789"), {
      target: { value: "081234567890" },
    });

    expect(onChange).toHaveBeenCalledWith({ ...value, whatsapp: "6281234567890" });
  });

  it("calls onChange with updated address", () => {
    const onChange = vi.fn();
    render(<CustomerForm value={value} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("Alamat pengiriman"), {
      target: { value: "Jl. Melati 1" },
    });

    expect(onChange).toHaveBeenCalledWith({ ...value, address: "Jl. Melati 1" });
  });
});
