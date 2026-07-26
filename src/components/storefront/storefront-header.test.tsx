import type React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
    h1: "h1",
    p: "p",
    a: "a",
  },
}));

import { StorefrontHeader } from "./storefront-header";
import type { Tenant } from "../../lib/types";

const tenant: Pick<Tenant, "name" | "tagline" | "avatar" | "links"> = {
  name: "Kopi Ibu",
  tagline: "Kopi hangat setiap hari",
  avatar: "",
  links: [
    { id: "link-1", label: "Instagram", url: "https://instagram.com/kopiibu" },
    { id: "link-2", label: "TikTok", url: "https://tiktok.com/@kopiibu" },
  ],
};

describe("StorefrontHeader", () => {
  it("renders tenant name, tagline, and profile links", () => {
    render(<StorefrontHeader tenant={tenant} />);

    expect(screen.getByText("Kopi Ibu")).toBeInTheDocument();
    expect(screen.getByText("Kopi hangat setiap hari")).toBeInTheDocument();
    const instagramLink = screen.getByRole("link", { name: /Instagram/ });
    expect(instagramLink).toHaveAttribute("href", "https://instagram.com/kopiibu");
    expect(screen.getByRole("link", { name: /TikTok/ })).toHaveAttribute(
      "href",
      "https://tiktok.com/@kopiibu",
    );
  });

  it("omits the links section entirely when tenant has no links", () => {
    render(<StorefrontHeader tenant={{ ...tenant, links: [] }} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
