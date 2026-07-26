import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "./field";

describe("Field", () => {
  it("renders label text and children", () => {
    render(
      <Field label="Nama Toko">
        <input placeholder="Masukkan nama toko" />
      </Field>,
    );

    expect(screen.getByText("Nama Toko")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Masukkan nama toko")).toBeInTheDocument();
  });

  it("supports composing help/error text as children content", () => {
    render(
      <Field label="Nomor WhatsApp">
        <input placeholder="628123456789" />
        <span className="text-destructive text-xs">Nomor tidak valid</span>
      </Field>,
    );

    expect(screen.getByText("Nomor tidak valid")).toBeInTheDocument();
  });

  it("merges custom className onto the label wrapper", () => {
    const { container } = render(
      <Field label="Nama Toko" className="mb-4">
        <input placeholder="Masukkan nama toko" />
      </Field>,
    );

    const label = container.querySelector("label");
    expect(label?.className).toContain("mb-4");
    expect(label?.className).toContain("block");
  });

  it("forwards ref to the underlying label element", () => {
    const ref = { current: null as HTMLLabelElement | null };

    render(
      <Field ref={ref} label="Nama Toko">
        <input placeholder="Masukkan nama toko" />
      </Field>,
    );

    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });
});
