import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import path from "node:path";

export type PutObjectInput = {
  key: string;
  buffer: Buffer;
  contentType: string;
};

export type PutObjectResult = {
  url: string;
  key: string;
};

type StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

let s3ClientOverride: S3Client | null = null;

function cleanBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function getR2Config(): StorageConfig | null {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || "",
  };

  const missing = Object.entries(config).filter(([, value]) => !value);
  if (missing.length === 0) return config;

  if (process.env.NODE_ENV === "production") {
    throw new Error("Konfigurasi R2 belum lengkap untuk upload gambar.");
  }

  return null;
}

function getS3Client(config: StorageConfig) {
  if (s3ClientOverride) return s3ClientOverride;

  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function createMediaKey({
  tenantId,
  filename,
  now = new Date(),
  id = randomUUID(),
}: {
  tenantId: string;
  filename: string;
  now?: Date;
  id?: string;
}) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const parsed = path.parse(filename.replace(/[\\/]/g, ""));
  const cleanName = (parsed.name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `tenants/${tenantId}/${year}/${month}/${id}-${cleanName || "image"}.webp`;
}

export async function putObject({
  key,
  buffer,
  contentType,
}: PutObjectInput): Promise<PutObjectResult> {
  const config = getR2Config();
  if (!config) {
    throw new Error("Konfigurasi R2 belum lengkap. Tambahkan env R2 untuk upload gambar.");
  }

  const client = getS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: PUBLIC_CACHE_CONTROL,
    }),
  );

  return {
    key,
    url: `${cleanBaseUrl(config.publicBaseUrl)}/${key}`,
  };
}

export const storage = {
  putObject,
};

export function setStorageS3ClientForTest(client: S3Client | null) {
  s3ClientOverride = client;
}
