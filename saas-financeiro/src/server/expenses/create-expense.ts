"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { postLedgerBatch, getOrCreateLogicalLedgerAccount } from "@/lib/ledger/ledger-engine";
import { money } from "@/lib/finance/money";
import { getDefaultUserId } from "@/server/finance/get-default-user";
import { getWorkingCapitalSummary } from "@/lib/finance/working-capital";

const EXPENSE_CATEGORIES = [
  "OPERATIONAL","MARKETING","ADVERTISING","SALARIES","TRANSPORT","COMMISSIONS",
  "BANK_FEES","PLATFORM_FEES","TECHNOLOGY","OFFICE","TAXES","SUPPLIERS","FINANCIAL","OTHER",
] as const;

const CreateExpenseInput = z.object({
  companyId: z.string(),
  accountLedgerId: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().min(1),
  paymentMethod: z.string().optional(),
});

export type CreateExpenseState = { error?: string; success?: boolean; warning?: string };

export async function createExpense(
  _prevState: CreateExpenseState,
  formData: FormData
): Promise<CreateExpenseState> {
  const parsed = CreateExpenseInput.safeParse({
    companyId: formData.get("companyId"),
    accountLedgerId: formData.get("accountLedgerId"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const amount = money(data.amount);
  const responsibleId = await getDefaultUserId();

  await prisma.$transaction(async (tx) => {
    await tx.expense.create({
      data: {
        companyId: data.companyId,
        category: data.category,
        description: data.description,
        amount: amount.toFixed(6),
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        responsibleId,
      },
    });

    const expenseLedger = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId,
      kind: "EXPENSE",
      currency: data.currency,
      name: `Despesas (${data.currency})`,
      tx,
    });

    await postLedgerBatch(
      {
        lines: [
          { ledgerAccountId: expenseLedger.id, direction: "DEBIT", amount, currency: data.currency, memo: data.description },
          { ledgerAccountId: data.accountLedgerId, direction: "CREDIT", amount, currency: data.currency, memo: data.description },
        ],
      },
      tx
    );
  });

  // Alerta de orçamento (secção 20: "Despesa acima do orçamento") — não bloqueia, apenas avisa.
  const budget = await prisma.budget.findUnique({
    where: { companyId_category_currency: { companyId: data.companyId, category: data.category, currency: data.currency } },
  });

  let warning: string | undefined;
  if (budget) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const spent = await prisma.expense.aggregate({
      where: { companyId: data.companyId, category: data.category, currency: data.currency, occurredAt: { gte: monthStart } },
      _sum: { amount: true },
    });
    const totalSpent = money(spent._sum.amount ?? 0);
    if (totalSpent.greaterThan(budget.monthlyCap)) {
      warning = `Orçamento mensal de ${data.category} (${budget.monthlyCap} ${data.currency}) foi excedido — total do mês: ${totalSpent.toFixed(2)} ${data.currency}.`;
      await prisma.notification.create({
        data: {
          userId: responsibleId,
          type: "BUDGET_EXCEEDED",
          severity: "WARNING",
          message: warning,
        },
      });
    }
  }

  // Alerta de capital abaixo do mínimo (secção 20 + 12) — verifica após a saída de caixa.
  const capitalSummary = await getWorkingCapitalSummary({ companyIds: [data.companyId] });
  if (capitalSummary.capitalLivre.lessThan(capitalSummary.capitalMinimoRecomendado)) {
    const capitalWarning = `Capital livre (${capitalSummary.capitalLivre.toFixed(2)} ${capitalSummary.referenceCurrency}) está abaixo do mínimo recomendado (${capitalSummary.capitalMinimoRecomendado.toFixed(2)} ${capitalSummary.referenceCurrency}).`;
    warning = warning ? `${warning} ${capitalWarning}` : capitalWarning;
    await prisma.notification.create({
      data: { userId: responsibleId, type: "CAPITAL_BELOW_MIN", severity: "CRITICAL", message: capitalWarning },
    });
  }

  revalidatePath("/despesas");
  revalidatePath("/dashboard");
  revalidatePath("/capital-giro");
  return { success: true, warning };
}
