"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { add, percent, sub } from "@/lib/finance/money";
import { generateOperationCode } from "@/lib/finance/operation-code";
import { getOrCreateLogicalLedgerAccount, postLedgerBatch } from "@/lib/ledger/ledger-engine";
import { getCurrentUserId } from "@/lib/auth/current-user";

// ============================================================================
// PRINCÍPIO FUNDAMENTAL (secção 26 do pedido): registar UMA operação de
// arbitragem alimenta automaticamente:
//   - Capital (reduzido/comprometido via ledger)
//   - Receita (Revenue) e custos
//   - Lucro (calculado, nunca digitado)
//   - Ledger (lançamentos equilibrados)
//   - Dashboard / P&L / Cash Flow (derivam do ledger, sem escrita duplicada)
// O utilizador nunca insere os mesmos números duas vezes.
// ============================================================================

const ArbitrageInput = z.object({
  companyId: z.string(),
  customerId: z.string().optional(),
  originCurrency: z.string().min(1),
  destCurrency: z.string().min(1),
  referenceCurrency: z.string().default("AOA"),
  capitalUsed: z.coerce.number().positive(),
  buyRate: z.coerce.number().positive(),
  sellRate: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  costs: z.coerce.number().min(0).default(0),
  commissions: z.coerce.number().min(0).default(0),
  fees: z.coerce.number().min(0).default(0),
  finalRevenue: z.coerce.number().positive(),
  counterparty: z.string().optional(),
  notes: z.string().optional(),
});

export type ArbitrageState = { error?: string; success?: boolean; code?: string; netProfit?: string; roiPercent?: string };

export async function createArbitrageOperation(
  _prevState: ArbitrageState,
  formData: FormData
): Promise<ArbitrageState> {
  const parsed = ArbitrageInput.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId") || undefined,
    originCurrency: formData.get("originCurrency"),
    destCurrency: formData.get("destCurrency"),
    referenceCurrency: formData.get("referenceCurrency") || "AOA",
    capitalUsed: formData.get("capitalUsed"),
    buyRate: formData.get("buyRate"),
    sellRate: formData.get("sellRate"),
    quantity: formData.get("quantity"),
    costs: formData.get("costs") || 0,
    commissions: formData.get("commissions") || 0,
    fees: formData.get("fees") || 0,
    finalRevenue: formData.get("finalRevenue"),
    counterparty: formData.get("counterparty") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const createdById = await getCurrentUserId();

  const totalCosts = add(add(data.costs, data.commissions), data.fees);
  const grossProfit = sub(data.finalRevenue, data.capitalUsed);
  const netProfit = sub(grossProfit, totalCosts);
  const marginPercent = percent(netProfit, data.finalRevenue);
  const roiPercent = percent(netProfit, data.capitalUsed);

  const code = await generateOperationCode();

  await prisma.$transaction(async (tx) => {
    const operation = await tx.operation.create({
      data: {
        code,
        type: "ARBITRAGE_FX",
        status: "COMPLETED",
        companyId: data.companyId,
        customerId: data.customerId,
        currency: data.originCurrency,
        capitalAmount: data.capitalUsed.toString(),
        costAmount: totalCosts.toFixed(6),
        revenueAmount: data.finalRevenue.toString(),
        grossProfit: grossProfit.toFixed(6),
        netProfit: netProfit.toFixed(6),
        referenceCurrency: data.referenceCurrency,
        createdById,
        notes: data.notes,
      },
    });

    await tx.arbitrageOperation.create({
      data: {
        operationId: operation.id,
        originCurrency: data.originCurrency,
        destCurrency: data.destCurrency,
        capitalUsed: data.capitalUsed.toString(),
        buyRate: data.buyRate.toString(),
        sellRate: data.sellRate.toString(),
        quantity: data.quantity.toString(),
        costs: data.costs.toString(),
        commissions: data.commissions.toString(),
        fees: data.fees.toString(),
        finalRevenue: data.finalRevenue.toString(),
        grossProfit: grossProfit.toFixed(6),
        netProfit: netProfit.toFixed(6),
        marginPercent: marginPercent.toFixed(4),
        roiPercent: roiPercent.toFixed(4),
        counterparty: data.counterparty,
        status: "COMPLETED",
        notes: data.notes,
      },
    });

    const workingCapital = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId,
      kind: "WORKING_CAPITAL",
      currency: data.originCurrency,
      name: `Capital de Giro (${data.originCurrency})`,
      tx,
    });
    const revenueAccount = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId,
      kind: "REVENUE",
      currency: data.originCurrency,
      name: `Receitas — Arbitragem (${data.originCurrency})`,
      tx,
    });
    const expenseAccount = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId,
      kind: "EXPENSE",
      currency: data.originCurrency,
      name: `Custos — Arbitragem (${data.originCurrency})`,
      tx,
    });

    await postLedgerBatch(
      {
        operationId: operation.id,
        lines: [
          { ledgerAccountId: workingCapital.id, direction: "DEBIT", amount: data.finalRevenue, currency: data.originCurrency, reference: code },
          { ledgerAccountId: revenueAccount.id, direction: "CREDIT", amount: data.finalRevenue, currency: data.originCurrency, reference: code },
          { ledgerAccountId: expenseAccount.id, direction: "DEBIT", amount: totalCosts.plus(data.capitalUsed), currency: data.originCurrency, reference: code },
          { ledgerAccountId: workingCapital.id, direction: "CREDIT", amount: totalCosts.plus(data.capitalUsed), currency: data.originCurrency, reference: code },
        ],
      },
      tx
    );

    await tx.revenue.create({
      data: {
        companyId: data.companyId,
        description: `Arbitragem ${data.originCurrency}->${data.destCurrency} (${code})`,
        category: "Arbitragem cambial",
        amount: data.finalRevenue.toString(),
        currency: data.originCurrency,
        operationId: operation.id,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: createdById,
        entityType: "Operation",
        entityId: operation.id,
        action: "CREATE",
        newValue: { code, type: "ARBITRAGE_FX", netProfit: netProfit.toFixed(6) },
      },
    });
  });

  revalidatePath("/operacoes");
  revalidatePath("/arbitragem");
  revalidatePath("/dashboard");
  return { success: true, code, netProfit: netProfit.toFixed(2), roiPercent: roiPercent.toFixed(2) };
}
