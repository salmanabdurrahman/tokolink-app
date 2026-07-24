import { describe, expect, it } from "vitest";
import { parseCookie } from "./cookies";

describe("parseCookie", () => {
  it("returns decoded cookie value by exact name", () => {
    expect(
      parseCookie("theme=dark; sb-access-token=abc%20123; other=value", "sb-access-token"),
    ).toBe("abc 123");
  });

  it("returns null for missing cookie and does not match partial names", () => {
    expect(parseCookie("x-sb-access-token=wrong; other=value", "sb-access-token")).toBeNull();
    expect(parseCookie("", "sb-access-token")).toBeNull();
  });
});
