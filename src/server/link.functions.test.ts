import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  prisma: {
    link: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callbackOrQueries) => {
      if (Array.isArray(callbackOrQueries)) return Promise.all(callbackOrQueries);
      return callbackOrQueries({});
    }),
  },
}));

vi.mock("./auth-middleware", () => ({ authMiddleware: vi.fn() }));

import { prisma } from "../db";
import { addLink, deleteLink, getLinks, reorderLinks, updateLink } from "./link.functions";

const prismaAny = prisma as any;
const addLinkHandler = addLink as any;
const getLinksHandler = getLinks as any;
const updateLinkHandler = updateLink as any;
const deleteLinkHandler = deleteLink as any;
const reorderLinkHandler = reorderLinks as any;

const tenantContext = { tenant: { id: "tenant-1" } };
const noTenantContext = { user: { id: "user-1" } };
const otherId = "11111111-1111-4111-8111-111111111111";

describe("link ownership guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects link update/delete when link belongs to another tenant", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue(null);

    await expect(
      updateLinkHandler({ data: { id: otherId, data: { label: "IG" } }, context: tenantContext }),
    ).rejects.toThrow("Tautan tidak ditemukan atau bukan milik toko Anda");

    await expect(deleteLinkHandler({ data: otherId, context: tenantContext })).rejects.toThrow(
      "Tautan tidak ditemukan atau bukan milik toko Anda",
    );
    expect(prisma.link.update).not.toHaveBeenCalled();
    expect(prisma.link.delete).not.toHaveBeenCalled();
  });
});

describe("addLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws without tenant context", async () => {
    await expect(
      addLinkHandler({
        data: { label: "Instagram", url: "https://instagram.com/test" },
        context: noTenantContext,
      }),
    ).rejects.toThrow("Toko tidak ditemukan untuk pengguna ini");
  });

  it("creates link with next sort order", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue({ sortOrder: 5 });
    vi.mocked(prismaAny.link.create).mockResolvedValue({
      id: "link-1",
      label: "Instagram",
      url: "https://instagram.com/test",
      icon: "instagram",
      sortOrder: 6,
      tenantId: "tenant-1",
    });

    const result = await addLinkHandler({
      data: { label: "Instagram", url: "https://instagram.com/test", icon: "instagram" },
      context: tenantContext,
    });

    expect(result).toMatchObject({ label: "Instagram", sortOrder: 6 });
    expect(prisma.link.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        label: "Instagram",
        url: "https://instagram.com/test",
        sortOrder: 6,
        tenantId: "tenant-1",
      }),
    });
  });

  it("starts sort order at 0 when no existing links", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue(null);
    vi.mocked(prismaAny.link.create).mockResolvedValue({
      id: "link-1",
      label: "First",
      url: "https://example.com",
      icon: null,
      sortOrder: 0,
      tenantId: "tenant-1",
    });

    await addLinkHandler({
      data: { label: "First", url: "https://example.com" },
      context: tenantContext,
    });

    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 0 }),
      }),
    );
  });
});

describe("updateLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates tenant-owned link and clears storefront cache", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue({ id: "link-1", tenantId: "tenant-1" });
    vi.mocked(prismaAny.link.update).mockResolvedValue({
      id: "link-1",
      label: "IG Baru",
      url: "https://instagram.com/new",
      icon: "instagram",
    });

    const result = await updateLinkHandler({
      data: {
        id: "link-1",
        data: { label: "IG Baru", url: "https://instagram.com/new", icon: "instagram" },
      },
      context: tenantContext,
    });

    expect(result).toMatchObject({ label: "IG Baru" });
    expect(prisma.link.update).toHaveBeenCalledWith({
      where: { id: "link-1" },
      data: { label: "IG Baru", url: "https://instagram.com/new", icon: "instagram" },
    });
  });
});

describe("deleteLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes tenant-owned link and clears storefront cache", async () => {
    vi.mocked(prismaAny.link.findFirst).mockResolvedValue({ id: "link-1", tenantId: "tenant-1" });
    vi.mocked(prismaAny.link.delete).mockResolvedValue({ id: "link-1" });

    const result = await deleteLinkHandler({ data: "link-1", context: tenantContext });

    expect(result).toEqual({ success: true });
    expect(prisma.link.delete).toHaveBeenCalledWith({ where: { id: "link-1" } });
  });
});

describe("reorder link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects reorder when some links are not tenant-owned", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    vi.mocked(prismaAny.link.findMany).mockResolvedValue([{ id: ids[0] }]);

    await expect(reorderLinkHandler({ data: ids, context: tenantContext })).rejects.toThrow(
      "Tautan tidak ditemukan atau bukan milik toko Anda",
    );
    expect(prisma.link.update).not.toHaveBeenCalled();
  });

  it("persists link sortOrder for tenant-owned links", async () => {
    const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    vi.mocked(prismaAny.link.findMany).mockResolvedValue(ids.map((id) => ({ id })));
    vi.mocked(prismaAny.link.update).mockResolvedValue({});
    vi.mocked(prismaAny.$transaction).mockImplementation(async (queries: any[]) =>
      Promise.all(queries),
    );

    await expect(reorderLinkHandler({ data: ids, context: tenantContext })).resolves.toEqual({
      success: true,
    });

    expect(prisma.link.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", id: { in: ids } },
      select: { id: true },
    });
    expect(prisma.link.update).toHaveBeenNthCalledWith(1, {
      where: { id: ids[0] },
      data: { sortOrder: 0 },
    });
    expect(prisma.link.update).toHaveBeenNthCalledWith(2, {
      where: { id: ids[1] },
      data: { sortOrder: 1 },
    });
  });
});

describe("getLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns links ordered by sortOrder for tenant", async () => {
    const mockLinks = [
      { id: "l1", label: "Instagram", url: "https://ig.com", icon: null, sortOrder: 0 },
      { id: "l2", label: "TikTok", url: "https://tiktok.com", icon: null, sortOrder: 1 },
    ];
    vi.mocked(prismaAny.link.findMany).mockResolvedValue(mockLinks);

    const result = await getLinksHandler({ data: "tenant-1" });

    expect(result).toEqual(mockLinks);
    expect(prisma.link.findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1" },
      orderBy: { sortOrder: "asc" },
    });
  });

  it("returns empty array for tenant with no links", async () => {
    vi.mocked(prismaAny.link.findMany).mockResolvedValue([]);

    const result = await getLinksHandler({ data: "tenant-empty" });

    expect(result).toEqual([]);
  });
});
