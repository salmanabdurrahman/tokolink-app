import { describe, expect, it } from "vitest";
import { isValidImageBuffer } from "./upload.functions";

describe("isValidImageBuffer", () => {
  it("accepts supported image magic bytes", () => {
    expect(isValidImageBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
    expect(isValidImageBuffer(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe(true);
    expect(isValidImageBuffer(Buffer.from([0x47, 0x49, 0x46, 0x38]))).toBe(true);
    expect(
      isValidImageBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe(true);
  });

  it("rejects invalid and too short buffers", () => {
    expect(isValidImageBuffer(Buffer.from([0x89, 0x50, 0x4e]))).toBe(false);
    expect(isValidImageBuffer(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBe(false);
    expect(
      isValidImageBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x4e, 0x4f, 0x50, 0x45])),
    ).toBe(false);
  });
});
