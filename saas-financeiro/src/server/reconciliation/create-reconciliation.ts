"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAccountBalance } from "@/lib/finance/account-balance";
import { sub, ZERO } from "@/lib/finance/money";

// ============================================================================
// Reconciliação — compara o saldo do LEDGER (fonte de verdade) com o saldo
// real informado pelo utilizador. Nunca "corrige" o ledger automaticamente:
// apenas regista a diferença para investigação/ajuste manual explícito.
// ============================================================================

const ReconciliationInput = z.object({
  companyId: z.string(),
  accountId: z.string(),
  realBalance: z.coerce.number(),
  notes: z.string().optional(),
});

export type ReconciliationState = { error?: string; success?: boolean };

export async function createReconciliation(
  _prevState: ReconciliationState,
  formData: FormData
): Promise<ReconciliationState> {
  const parsed = ReconciliationInput.safeParse({
    companyId: formData.get("companyId"),
    accountId: formData.get("accountId"),
    realBalance: formData.get("realBalance"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const systemBalance = await getAccountBalance(data.accountId);
  const difference = sub(systemBalance, data.realBalance);

  const status = difference.equals(ZERO) ? "RECONCILED" : "DIFFERENCE_FOUND";

  await prisma.reconciliation.create({
    data: {
      companyId: data.companyId,
      accountId: data.accountId,
      systemBalance: systemBalance.toFixed(6),
      realBalance: data.realBalance.toString(),
      difference: difference.toFixed(6),
      status,
      notes: data.notes,
    },
  });

  revalidatePath("/reconciliacao");
  return { success: true };
}
