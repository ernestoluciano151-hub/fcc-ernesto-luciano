"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { postLedgerBatch, getOrCreateLogicalLedgerAccount } from "@/lib/ledger/ledger-engine";
import { money } from "@/lib/finance/money";

// ============================================================================
// Registar uma receita avulsa (não ligada a uma Operação específica, ex:
// arbitragem). Alimenta automaticamente: Revenue (para relatórios/filtros),
// ledger (entra na conta bancária/carteira escolhida) — Dashboard, P&L e
// Cash Flow leem sempre daqui, sem precisar de novo input.
// ============================================================================

const CreateRevenueInput = z.object({
  companyId: z.string(),
  accountLedgerId: z.string(), // id da LedgerAccount da Account/Wallet que recebeu o dinheiro
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(1),
});

export type CreateRevenueState = { error?: string; success?: boolean };

export async function createRevenue(
  _prevState: CreateRevenueState,
  formData: FormData
): Promise<CreateRevenueState> {
  const parsed = CreateRevenueInput.safeParse({
    companyId: formData.get("companyId"),
    accountLedgerId: formData.get("accountLedgerId"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const amount = money(data.amount);

  await prisma.$transaction(async (tx) => {
    await tx.revenue.create({
      data: {
        companyId: data.companyId,
        description: data.description,
        category: data.category,
        amount: amount.toFixed(6),
        currency: data.currency,
      },
    });

    const revenueLedger = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId,
      kind: "REVENUE",
      currency: data.currency,
      name: `Receitas (${data.currency})`,
      tx,
    });

    await postLedgerBatch(
      {
        lines: [
          { ledgerAccountId: data.accountLedgerId, direction: "DEBIT", amount, currency: data.currency, memo: data.description },
          { ledgerAccountId: revenueLedger.id, direction: "CREDIT", amount, currency: data.currency, memo: data.description },
        ],
      },
      tx
    );
  });

  revalidatePath("/receitas");
  revalidatePath("/dashboard");
  return { success: true };
}
