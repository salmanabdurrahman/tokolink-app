import type { PrismaClient } from "@prisma/client";

export type AuthTenantContext = {
  tenant?: { id: string } | null;
};

export function requireTenant(
  context: AuthTenantContext,
  message = "Toko tidak ditemukan untuk pengguna ini",
) {
  const tenantId = context.tenant?.id;
  if (!tenantId) throw new Error(message);
  return tenantId;
}

type TenantScopedModel = {
  findFirst(args: Record<string, unknown>): Promise<unknown>;
};

type TenantScopedModelName = "product" | "link" | "order" | "productCategory";

const ownershipMessages: Record<TenantScopedModelName, string> = {
  product: "Produk tidak ditemukan atau bukan milik toko Anda",
  link: "Tautan tidak ditemukan atau bukan milik toko Anda",
  order: "Order tidak ditemukan",
  productCategory: "Kategori tidak ditemukan atau bukan milik toko Anda",
};

export async function requireOwnedRecord(
  prisma: PrismaClient,
  modelName: TenantScopedModelName,
  id: string,
  tenantId: string,
  args: Record<string, unknown> = {},
) {
  const model = prisma[modelName] as unknown as TenantScopedModel;
  const record = await model.findFirst({ ...args, where: { id, tenantId } });
  if (!record) throw new Error(ownershipMessages[modelName]);
  return record;
}
