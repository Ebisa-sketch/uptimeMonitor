import { PrismaClient } from '@prisma/client';

// Extend BigInt prototype so JSON.stringify doesn't fail on BigInt fields (CheckResult.id)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient();
