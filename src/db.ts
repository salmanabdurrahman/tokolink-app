import prismaClientPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaClientPkg;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

type PrismaClientInstance = InstanceType<typeof PrismaClient>;

declare global {
  var __prisma: PrismaClientInstance | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
