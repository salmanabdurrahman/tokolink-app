import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    media: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("./storage", () => ({
  storage: { deleteObject: vi.fn() },
}));

import { prisma } from "../db";
import { storage } from "./storage";
import { deleteTenantMediaByUrl } from "./media-cleanup";

const prismaAny = prisma as any;
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("deleteTenantMediaByUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when url is not provided", async () => {
    await deleteTenantMediaByUrl("tenant-1", undefined);

    expect(prisma.media.findFirst).not.toHaveBeenCalled();
  });

  it("does nothing when media model has no findFirst on prisma client", async () => {
    const originalMedia = prismaAny.media;
    prismaAny.media = {};

    await deleteTenantMediaByUrl("tenant-1", "https://media.example.com/logo.webp");

    expect(storage.deleteObject).not.toHaveBeenCalled();
    prismaAny.media = originalMedia;
  });

  it("does nothing when media record is not found", async () => {
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue(null);

    await deleteTenantMediaByUrl("tenant-1", "https://media.example.com/logo.webp");

    expect(prisma.media.findFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", url: "https://media.example.com/logo.webp" },
    });
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(prisma.media.delete).not.toHaveBeenCalled();
  });

  it("deletes storage object and media record when found", async () => {
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue({
      id: "media-1",
      key: "tenants/tenant-1/2026/07/logo.webp",
    });
    vi.mocked(storage.deleteObject).mockResolvedValue(undefined);
    vi.mocked(prismaAny.media.delete).mockResolvedValue({});

    await deleteTenantMediaByUrl("tenant-1", "https://media.example.com/logo.webp");

    expect(storage.deleteObject).toHaveBeenCalledWith("tenants/tenant-1/2026/07/logo.webp");
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: "media-1" } });
  });

  it("logs and stops without deleting media record when storage delete fails", async () => {
    vi.mocked(prismaAny.media.findFirst).mockResolvedValue({
      id: "media-1",
      key: "tenants/tenant-1/2026/07/logo.webp",
    });
    vi.mocked(storage.deleteObject).mockRejectedValue(new Error("R2 down"));

    await deleteTenantMediaByUrl("tenant-1", "https://media.example.com/logo.webp");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to delete media object:",
      expect.any(Error),
    );
    expect(prisma.media.delete).not.toHaveBeenCalled();
  });
});
