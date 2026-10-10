import "server-only";
import { PrismaClient } from "@prisma/client";

// Limits added to the connection string, in seconds except for the pool size. They keep one slow query or one
// unreachable database from holding a request open, and keep each server instance to a small share of the pool.
const LIMITS = { connect_timeout: "10", pool_timeout: "10", socket_timeout: "15", connection_limit: "5" };

function limitedUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const url = new URL(raw);
  Object.entries(LIMITS).forEach(([name, value]) => {
    if (!url.searchParams.has(name)) url.searchParams.set(name, value);
  });
  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: limitedUrl(),
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
