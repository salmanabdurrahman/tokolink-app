import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: "div",
  },
}));

import { Modal } from "./modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Isi modal</p>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog content when open", () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Isi modal</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Isi modal")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open onClose={onClose}>
        <p>Isi modal</p>
      </Modal>,
    );

    const backdrop = container.querySelector(".absolute.inset-0") as HTMLElement;
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} closeLabel="Tutup dialog">
        <p>Isi modal</p>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tutup dialog" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>Isi modal</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus within dialog on Tab from last focusable element", () => {
    render(
      <Modal open onClose={vi.fn()}>
        <button type="button">Aksi</button>
      </Modal>,
    );

    const closeButton = screen.getByRole("button", { name: "Tutup modal" });
    const actionButton = screen.getByRole("button", { name: "Aksi" });

    actionButton.focus();
    expect(document.activeElement).toBe(actionButton);

    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(closeButton);
  });

  it("shift+tab from first focusable element wraps to last", () => {
    render(
      <Modal open onClose={vi.fn()}>
        <button type="button">Aksi</button>
      </Modal>,
    );

    const closeButton = screen.getByRole("button", { name: "Tutup modal" });
    closeButton.focus();
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Aksi" }));
  });

  it("keeps focus on the dialog and prevents default when no element is focusable", () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Isi modal</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    const querySelectorAllSpy = vi
      .spyOn(HTMLElement.prototype, "querySelectorAll")
      .mockReturnValue([] as unknown as NodeListOf<HTMLElement>);
    const focusSpy = vi.spyOn(dialog, "focus");

    const event = fireEvent.keyDown(document, { key: "Tab", cancelable: true });

    expect(event).toBe(false);
    expect(focusSpy).toHaveBeenCalled();

    querySelectorAllSpy.mockRestore();
  });
});
