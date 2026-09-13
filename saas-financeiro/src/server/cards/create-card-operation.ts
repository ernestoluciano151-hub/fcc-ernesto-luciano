"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { add, sub } from "@/lib/finance/money";
import { generateOperationCode } from "@/lib/finance/operation-code";
import { getOrCreateLogicalLedgerAccount, postLedgerBatch } from "@/lib/ledger/ledger-engine";
import { getDefaultUserId } from "@/server/finance/get-default-user";

// ============================================================================
// Carregamento de cartões (secção 7 do pedido). NUNCA guardar número
// completo do cartão, CVV ou PIN — só um token/referência interna.
// ============================================================================

const CardOperationInput = z.object({
  companyId: z.string(),
  customerId: z.string(),
  cardToken: z.string().min(1),
  network: z.enum(["VISA", "MASTERCARD", "OTHER"]),
  loadedAmount: z.coerce.number().positive(),
  currency: z.string().min(1),
  operationCost: z.coerce.number().min(0).default(0),
  commissionCharged: z.coerce.number().min(0).default(0),
  receivedAmount: z.coerce.number().positive(),
  notes: z.string().optional(),
});

export type CardOperationState = { error?: string; success?: boolean; code?: string; profit?: string };

export async function createCardOperation(
  _prevState: CardOperationState,
  formData: FormData
): Promise<CardOperationState> {
  const parsed = CardOperationInput.safeParse({
    companyId: formData.get("companyId"),
    customerId: formData.get("customerId"),
    cardToken: formData.get("cardToken"),
    network: formData.get("network"),
    loadedAmount: formData.get("loadedAmount"),
    currency: formData.get("currency"),
    operationCost: formData.get("operationCost") || 0,
    commissionCharged: formData.get("commissionCharged") || 0,
    receivedAmount: formData.get("receivedAmount"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const createdById = await getDefaultUserId();

  const profit = sub(data.receivedAmount, add(data.loadedAmount, data.operationCost));
  const code = await generateOperationCode();

  await prisma.$transaction(async (tx) => {
    const operation = await tx.operation.create({
      data: {
        code,
        type: "CARD_TOPUP",
        status: "COMPLETED",
        companyId: data.companyId,
        customerId: data.customerId,
        currency: data.currency,
        capitalAmount: data.loadedAmount.toString(),
        costAmount: data.operationCost.toString(),
        revenueAmount: data.receivedAmount.toString(),
        grossProfit: profit.toFixed(6),
        netProfit: profit.toFixed(6),
        createdById,
        notes: data.notes,
      },
    });

    await tx.cardOperation.create({
      data: {
        operationId: operation.id,
        customerId: data.customerId,
        cardToken: data.cardToken,
        network: data.network,
        loadedAmount: data.loadedAmount.toString(),
        currency: data.currency,
        operationCost: data.operationCost.toString(),
        commissionCharged: data.commissionCharged.toString(),
        receivedAmount: data.receivedAmount.toString(),
        profit: profit.toFixed(6),
        notes: data.notes,
      },
    });

    const workingCapital = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId, kind: "WORKING_CAPITAL", currency: data.currency,
      name: `Capital de Giro (${data.currency})`, tx,
    });
    const revenueAccount = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId, kind: "REVENUE", currency: data.currency,
      name: `Receitas — Cartões (${data.currency})`, tx,
    });
    const expenseAccount = await getOrCreateLogicalLedgerAccount({
      companyId: data.companyId, kind: "EXPENSE", currency: data.currency,
      name: `Custos — Cartões (${data.currency})`, tx,
    });

    const totalOut = add(data.loadedAmount, data.operationCost);
    await postLedgerBatch(
      {
        operationId: operation.id,
        lines: [
          { ledgerAccountId: workingCapital.id, direction: "DEBIT", amount: data.receivedAmount, currency: data.currency, reference: code },
          { ledgerAccountId: revenueAccount.id, direction: "CREDIT", amount: data.receivedAmount, currency: data.currency, reference: code },
          { ledgerAccountId: expenseAccount.id, direction: "DEBIT", amount: totalOut, currency: data.currency, reference: code },
          { ledgerAccountId: workingCapital.id, direction: "CREDIT", amount: totalOut, currency: data.currency, reference: code },
        ],
      },
      tx
    );

    await tx.auditLog.create({
      data: {
        actorId: createdById,
        entityType: "Operation",
        entityId: operation.id,
        action: "CREATE",
        newValue: { code, type: "CARD_TOPUP", profit: profit.toFixed(6) },
      },
    });
  });

  revalidatePath("/cartoes");
  revalidatePath("/operacoes");
  revalidatePath("/dashboard");
  return { success: true, code, profit: profit.toFixed(2) };
}
