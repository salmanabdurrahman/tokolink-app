import { describe, expect, it } from "vitest";
import { redactLogFields } from "./logger.server";

describe("logger redaction", () => {
  it("redacts sensitive field names recursively", () => {
    expect(
      redactLogFields({
        cookie: "session",
        nested: { apiKey: "secret", ok: "value" },
        list: [{ token: "secret" }],
      }),
    ).toEqual({
      cookie: "[redacted]",
      nested: { apiKey: "[redacted]", ok: "value" },
      list: [{ token: "[redacted]" }],
    });
  });
});
