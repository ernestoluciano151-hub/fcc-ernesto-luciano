"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { add, div, mul, percent, sub, money } from "@/lib/finance/money";
import { generateOperationCode } from "@/lib/finance/operation-code";
import { getOrCreateLogicalLedgerAccount, postLedgerBatch } from "@/lib/ledger/ledger-engine";

// ============================================================================
// Exemplo de referência do PRINCÍPIO FUNDAMENTAL (secção 26 do pedido):
// registar UMA operação de arbitragem alimenta automaticamente:
//   - Capital (reduzido/comprometido via ledger)
//   - Receita (Revenue)
//   - Despesa/custos (Expense, se aplicável)
//   - Lucro (calculado, nunca digitado)
//   - Ledger (lançamentos equilibrados)
//   - Dashboard / P&L / Cash Flow (derivam do ledger, sem escrita duplicada)
// O utilizador nunca insere os mesmos números duas vezes.
// ============================================================================

const ArbitrageInput = z.object({
  companyId: z.string(),
  customerId: z.string().optional(),
  createdById: z.string(),
  originCurrency: z.string(),
  destCurrency: z.string(),
  referenceCurrency: z.string().default("AOA"),
  capitalUsed: z.number().positive(),
  buyRate: z.number().positive(),
  sellRate: z.number().positive(),
  quantity: z.number().positive(),
  costs: z.number().min(0).default(0),
  commissions: z.number().min(0).default(0),
  fees: z.number().min(0).default(0),
  finalRevenue: z.number().positive(),
  counterparty: z.string().optional(),
  notes: z.string().optional(),
});

export async function createArbitrageOperation(input: z.infer<typeof ArbitrageInput>) {
  const data = ArbitrageInput.parse(input);

  const totalCosts = add(add(data.costs, data.commissions), data.fees);
  const grossProfit = sub(data.finalRevenue, data.capitalUsed);
  const netProfit = sub(grossProfit, totalCosts);
  const marginPercent = percent(netProfit, data.finalRevenue);
  const roiPercent = percent(netProfit, data.capitalUsed);

  const code = await generateOperationCode();

  return prisma.$transaction(async (tx) => {
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
        createdById: data.createdById,
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

    // --- Ledger: capital sai de WORKING_CAPITAL, entra em CLEARING, depois
    // resultado (receita) entra de volta em WORKING_CAPITAL líquido do lucro.
    // Simplificado aqui em duas pernas equilibradas por moeda de referência.
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
          // Receita da operação entra no capital de giro
          { ledgerAccountId: workingCapital.id, direction: "DEBIT", amount: data.finalRevenue, currency: data.originCurrency, reference: code },
          { ledgerAccountId: revenueAccount.id, direction: "CREDIT", amount: data.finalRevenue, currency: data.originCurrency, reference: code },
          // Capital utilizado e custos saem do capital de giro
          { ledgerAccountId: expenseAccount.id, direction: "DEBIT", amount: totalCosts.plus(data.capitalUsed), currency: data.originCurrency, reference: code },
          { ledgerAccountId: workingCapital.id, direction: "CREDIT", amount: totalCosts.plus(data.capitalUsed), currency: data.originCurrency, reference: code },
        ],
      },
      tx
    );

    // Receita e despesa também alimentam as tabelas dedicadas (para relatórios
    // e filtros por categoria) — mas o SALDO nunca vem daqui, vem do ledger.
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
        actorId: data.createdById,
        entityType: "Operation",
        entityId: operation.id,
        action: "CREATE",
        newValue: { code, type: "ARBITRAGE_FX", netProfit: netProfit.toFixed(6) },
      },
    });

    return { operation, netProfit: netProfit.toFixed(6), marginPercent: marginPercent.toFixed(2), roiPercent: roiPercent.toFixed(2) };
  });
}
