import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: "div",
  },
}));

import { Sheet } from "./sheet";

describe("Sheet", () => {
  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={vi.fn()}>
        <p>Isi panel</p>
      </Sheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog content when open", () => {
    render(
      <Sheet open onClose={vi.fn()}>
        <p>Isi panel</p>
      </Sheet>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Isi panel")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open onClose={onClose}>
        <p>Isi panel</p>
      </Sheet>,
    );

    const overlay = container.querySelector(".absolute.inset-0") as HTMLElement;
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} closeLabel="Tutup varian">
        <p>Isi panel</p>
      </Sheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tutup varian" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose}>
        <p>Isi panel</p>
      </Sheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses latest onClose callback without re-registering the keydown listener", () => {
    const firstOnClose = vi.fn();
    const secondOnClose = vi.fn();

    const { rerender } = render(
      <Sheet open onClose={firstOnClose}>
        <p>Isi panel</p>
      </Sheet>,
    );

    rerender(
      <Sheet open onClose={secondOnClose}>
        <p>Isi panel</p>
      </Sheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(secondOnClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus within panel on Tab from last focusable element", () => {
    render(
      <Sheet open onClose={vi.fn()}>
        <button type="button">Aksi</button>
      </Sheet>,
    );

    const closeButton = screen.getByRole("button", { name: "Tutup panel" });
    const actionButton = screen.getByRole("button", { name: "Aksi" });

    actionButton.focus();
    expect(document.activeElement).toBe(actionButton);

    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(closeButton);
  });

  it("shift+tab from first focusable element wraps to last", () => {
    render(
      <Sheet open onClose={vi.fn()}>
        <button type="button">Aksi</button>
      </Sheet>,
    );

    const closeButton = screen.getByRole("button", { name: "Tutup panel" });
    closeButton.focus();
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Aksi" }));
  });

  it("restores focus to the previously focused element on close", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Buka panel";
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <Sheet open onClose={vi.fn()}>
        <p>Isi panel</p>
      </Sheet>,
    );

    rerender(
      <Sheet open={false} onClose={vi.fn()}>
        <p>Isi panel</p>
      </Sheet>,
    );

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});
