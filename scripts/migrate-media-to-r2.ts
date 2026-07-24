import { prisma } from "../src/db";
import { createMediaKey, storage } from "../src/server/storage";

type MediaReference = {
  ownerType: "tenant" | "product";
  ownerId: string;
  tenantId: string;
  field: "avatar" | "image";
  url: string;
  name: string;
};

type MigrationMapping = MediaReference & {
  oldUrl: string;
  newUrl: string;
  key: string;
};

const LEGACY_BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

function isApplyMode() {
  return process.argv.includes("--apply");
}

function isLegacyBlobUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith(LEGACY_BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

function filenameFromUrl(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").filter(Boolean).pop();
    return filename || fallback;
  } catch {
    return fallback;
  }
}

async function collectMediaReferences(): Promise<MediaReference[]> {
  const [tenants, products] = await Promise.all([
    prisma.tenant.findMany({
      where: { avatar: { not: "" } },
      select: { id: true, avatar: true },
    }),
    prisma.product.findMany({
      where: { image: { not: "" } },
      select: { id: true, tenantId: true, image: true },
    }),
  ]);

  return [
    ...tenants
      .filter((tenant) => isLegacyBlobUrl(tenant.avatar))
      .map((tenant) => ({
        ownerType: "tenant" as const,
        ownerId: tenant.id,
        tenantId: tenant.id,
        field: "avatar" as const,
        url: tenant.avatar,
        name: filenameFromUrl(tenant.avatar, "avatar.webp"),
      })),
    ...products
      .filter((product) => isLegacyBlobUrl(product.image))
      .map((product) => ({
        ownerType: "product" as const,
        ownerId: product.id,
        tenantId: product.tenantId,
        field: "image" as const,
        url: product.image,
        name: filenameFromUrl(product.image, "product.webp"),
      })),
  ];
}

async function migrateReference(reference: MediaReference): Promise<MigrationMapping> {
  const response = await fetch(reference.url);
  if (!response.ok) {
    throw new Error(`Gagal download ${reference.url}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/webp";
  const buffer = Buffer.from(await response.arrayBuffer());
  const key = createMediaKey({ tenantId: reference.tenantId, filename: reference.name });
  const uploaded = await storage.putObject({ key, buffer, contentType });

  return {
    ...reference,
    oldUrl: reference.url,
    newUrl: uploaded.url,
    key: uploaded.key,
  };
}

async function updateReference(tx: typeof prisma, mapping: MigrationMapping) {
  if (mapping.ownerType === "tenant") {
    await tx.tenant.update({
      where: { id: mapping.ownerId },
      data: { avatar: mapping.newUrl },
    });
    return;
  }

  await tx.product.update({
    where: { id: mapping.ownerId },
    data: { image: mapping.newUrl },
  });
}

async function validatePublicUrl(url: string) {
  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok) {
    throw new Error(`URL R2 belum publik: ${url} (${response.status})`);
  }
}

async function main() {
  const apply = isApplyMode();
  const references = await collectMediaReferences();

  console.log(
    JSON.stringify({ mode: apply ? "apply" : "dry-run", total: references.length }, null, 2),
  );

  if (!apply) {
    console.log(JSON.stringify(references, null, 2));
    return;
  }

  const mappings: MigrationMapping[] = [];

  for (const reference of references) {
    const mapping = await migrateReference(reference);
    await validatePublicUrl(mapping.newUrl);
    await prisma.$transaction(async (tx) => {
      await updateReference(tx as typeof prisma, mapping);
    });
    mappings.push(mapping);
  }

  console.log(JSON.stringify({ migrated: mappings.length, mappings }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
