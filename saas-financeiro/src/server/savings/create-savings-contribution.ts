"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { postLedgerBatch, getOrCreateLogicalLedgerAccount } from "@/lib/ledger/ledger-engine";
import { money } from "@/lib/finance/money";

// ============================================================================
// Aporte/Retirada de uma Meta de Poupança (secção 13 do pedido).
// Um aporte MOVE dinheiro de uma conta/carteira real para a conta lógica
// SAVINGS da empresa (por moeda) — nunca cria dinheiro do nada. Uma retirada
// faz o inverso. currentAmount da meta é apenas um cache sincronizado nesta
// mesma transação; a verdade está sempre no ledger + na soma das contribuições.
// ============================================================================

const CreateSavingsContributionInput = z.object({
  savingsGoalId: z.string(),
  accountLedgerId: z.string(),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]).default("DEPOSIT"),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
});

export type CreateSavingsContributionState = { error?: string; success?: boolean };

export async function createSavingsContribution(
  _prevState: CreateSavingsContributionState,
  formData: FormData
): Promise<CreateSavingsContributionState> {
  const parsed = CreateSavingsContributionInput.safeParse({
    savingsGoalId: formData.get("savingsGoalId"),
    accountLedgerId: formData.get("accountLedgerId"),
    type: formData.get("type") || "DEPOSIT",
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const amount = money(data.amount);

  const goal = await prisma.savingsGoal.findUnique({ where: { id: data.savingsGoalId } });
  if (!goal) return { error: "Meta de poupança não encontrada." };

  if (data.type === "WITHDRAWAL" && amount.greaterThan(goal.currentAmount.toString())) {
    return { error: `Não é possível retirar ${amount} ${goal.currency}: a meta só tem ${goal.currentAmount} ${goal.currency} acumulados.` };
  }

  await prisma.$transaction(async (tx) => {
    const signedAmount = data.type === "WITHDRAWAL" ? amount.negated() : amount;

    await tx.savingsContribution.create({
      data: {
        savingsGoalId: goal.id,
        amount: signedAmount.toFixed(6),
        note: data.note,
      },
    });

    await tx.savingsGoal.update({
      where: { id: goal.id },
      data: { currentAmount: { increment: signedAmount.toFixed(6) } },
    });

    const savingsLedger = await getOrCreateLogicalLedgerAccount({
      companyId: goal.companyId,
      kind: "SAVINGS",
      currency: goal.currency,
      name: `Poupanças (${goal.currency})`,
      tx,
    });

    const memo = `${data.type === "WITHDRAWAL" ? "Retirada" : "Aporte"}: ${goal.name}`;

    await postLedgerBatch(
      {
        lines:
          data.type === "WITHDRAWAL"
            ? [
                { ledgerAccountId: savingsLedger.id, direction: "CREDIT", amount, currency: goal.currency, memo },
                { ledgerAccountId: data.accountLedgerId, direction: "DEBIT", amount, currency: goal.currency, memo },
              ]
            : [
                { ledgerAccountId: savingsLedger.id, direction: "DEBIT", amount, currency: goal.currency, memo },
                { ledgerAccountId: data.accountLedgerId, direction: "CREDIT", amount, currency: goal.currency, memo },
              ],
      },
      tx
    );
  });

  revalidatePath("/poupancas");
  revalidatePath(`/poupancas/${data.savingsGoalId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
