import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

declare global {
    // Using var here is required for global declarations
    // eslint-disable-next-line no-var
    var prisma: ReturnType<typeof createPrismaClient> | undefined;
}

function createPrismaClient() {
    return new PrismaClient({
        datasourceUrl: process.env.ACCELERATE_DATABASE_URL || process.env.DATABASE_URL,
    }).$extends(withAccelerate());
}

export const db = globalThis.prisma || createPrismaClient();

if(process.env.NODE_ENV !== "production") globalThis.prisma = db;