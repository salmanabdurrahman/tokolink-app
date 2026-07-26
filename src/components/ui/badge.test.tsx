import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children with default variant styles", () => {
    render(<Badge>Aktif</Badge>);

    const badge = screen.getByText("Aktif");
    expect(badge.className).toContain("bg-muted");
    expect(badge.className).toContain("text-muted-foreground");
  });

  it("applies accent variant styles", () => {
    render(<Badge variant="accent">Baru</Badge>);

    expect(screen.getByText("Baru").className).toContain("bg-accent");
  });

  it("applies outline variant styles", () => {
    render(<Badge variant="outline">Draft</Badge>);

    expect(screen.getByText("Draft").className).toContain("border");
  });

  it("applies destructive variant styles", () => {
    render(<Badge variant="destructive">Nonaktif</Badge>);

    expect(screen.getByText("Nonaktif").className).toContain("text-destructive");
  });

  it("merges custom className", () => {
    render(<Badge className="ml-2">Custom</Badge>);

    expect(screen.getByText("Custom").className).toContain("ml-2");
  });
});
