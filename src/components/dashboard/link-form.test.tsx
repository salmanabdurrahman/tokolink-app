import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinkForm } from "./link-form";

describe("LinkForm", () => {
  it("submits trimmed valid data and resets fields", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LinkForm onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText("Label (Instagram)"), {
      target: { value: "Instagram" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://instagram.com/kopiibu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Tambah" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        label: "Instagram",
        url: "https://instagram.com/kopiibu",
      }),
    );
    await waitFor(() => expect(screen.getByPlaceholderText("Label (Instagram)")).toHaveValue(""));
    expect(screen.getByPlaceholderText("https://...")).toHaveValue("");
  });

  it("shows validation errors and does not call onSave for an invalid URL", async () => {
    const onSave = vi.fn();
    const { container } = render(<LinkForm onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText("Label (Instagram)"), {
      target: { value: "Instagram" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "not-a-url" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(await screen.findByText("URL tidak valid")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows a validation error when the label is missing", async () => {
    const onSave = vi.fn();
    const { container } = render(<LinkForm onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://instagram.com/kopiibu" },
    });
    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    expect(await screen.findByText("Label harus diisi")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows submitting state while awaiting onSave", async () => {
    let resolveSave: () => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<LinkForm onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText("Label (Instagram)"), {
      target: { value: "Instagram" },
    });
    fireEvent.change(screen.getByPlaceholderText("https://..."), {
      target: { value: "https://instagram.com/kopiibu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Tambah" }));

    expect(await screen.findByRole("button", { name: "Menambah..." })).toBeDisabled();

    resolveSave();
    await waitFor(() => expect(screen.getByRole("button", { name: "+ Tambah" })).toBeEnabled());
  });
});
