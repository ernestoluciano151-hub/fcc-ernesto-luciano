import { prisma } from "@/lib/prisma";

// ============================================================================
// TEMPORÁRIO: enquanto a autenticação (Fase P13) não está ligada às páginas,
// usamos o primeiro utilizador ativo como "responsável" por lançamentos que
// exigem um autor. Assim que houver sessão real, substituir por session.user.id.
// ============================================================================
export async function getDefaultUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("Nenhum utilizador encontrado. Corre 'npm run db:seed' primeiro.");
  }
  return user.id;
}
