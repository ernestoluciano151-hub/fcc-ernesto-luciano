import { prisma } from "@/lib/prisma";

/** Gera códigos sequenciais no formato OP-2026-000001 */
export async function generateOperationCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OP-${year}-`;

  const last = await prisma.operation.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });

  const nextSeq = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(6, "0")}`;
}
