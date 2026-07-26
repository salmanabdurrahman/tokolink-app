import { describe, expect, it } from "vitest";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("renders a standalone Indonesian error page with reload and home actions", () => {
    const html = renderErrorPage();

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Halaman ini gagal dimuat");
    expect(html).toContain('onclick="location.reload()"');
    expect(html).toContain('href="/"');
  });

  it("is deterministic across calls", () => {
    expect(renderErrorPage()).toBe(renderErrorPage());
  });
});
