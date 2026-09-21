import { prisma } from "@/lib/prisma";

// ============================================================================
// Registo de auditoria — grava eventos imutáveis (login, logout, alterações
// críticas). Nunca lança erro para não bloquear o fluxo principal se a
// escrita de auditoria falhar.
// ============================================================================

export async function logAudit(params: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string;
  ipAddress?: string | null;
  device?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        reason: params.reason,
        ipAddress: params.ipAddress ?? null,
        device: params.device ?? null,
      },
    });
  } catch (err) {
    console.error("Falha ao gravar registo de auditoria:", err);
  }
}
