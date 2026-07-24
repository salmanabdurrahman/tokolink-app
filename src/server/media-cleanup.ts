import { prisma } from "../db";
import { storage } from "./storage";

export async function deleteTenantMediaByUrl(tenantId: string, url?: string) {
  if (!url) return;

  const mediaModel = (prisma as any).media;
  if (!mediaModel?.findFirst) return;

  const media = await mediaModel.findFirst({ where: { tenantId, url } });
  if (!media) return;

  try {
    await storage.deleteObject(media.key);
  } catch (error) {
    console.error("Failed to delete media object:", error);
    return;
  }

  await mediaModel.delete({ where: { id: media.id } });
}
