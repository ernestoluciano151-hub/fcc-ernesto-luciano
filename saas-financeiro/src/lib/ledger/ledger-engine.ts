import type { LedgerAccountKind, LedgerEntryDirection, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ZERO, add, sub, money, type Money } from "@/lib/finance/money";
import Decimal from "decimal.js";

// ============================================================================
// LEDGER ENGINE — camada de contabilidade interna de dupla entrada.
//
// REGRA DE OURO: nenhum saldo é armazenado num campo "balance" editável.
// Todo saldo é SEMPRE derivado por soma de LedgerEntry (credit - debit).
// Todo movimento financeiro relevante (operação, despesa, receita, venda,
// transferência) grava um conjunto de lançamentos EQUILIBRADO (debits = credits
// por moeda) através deste módulo — nunca diretamente via prisma.*.update no
// resto da aplicação.
// ============================================================================

export type PostingLine = {
  ledgerAccountId: string;
  direction: LedgerEntryDirection;
  amount: Decimal.Value;
  currency: string;
  reference?: string;
  memo?: string;
};

export type PostingBatch = {
  operationId?: string;
  lines: PostingLine[];
};

/** Garante existência de uma LedgerAccount lógica (não ligada a Account/Wallet real) por empresa+tipo+moeda. */
export async function getOrCreateLogicalLedgerAccount(params: {
  companyId: string;
  kind: LedgerAccountKind;
  currency: string;
  name: string;
  tx?: Prisma_TxClient;
}) {
  const db = params.tx ?? prisma;
  const existing = await db.ledgerAccount.findFirst({
    where: { companyId: params.companyId, kind: params.kind, currency: params.currency, accountId: null, walletId: null },
  });
  if (existing) return existing;
  return db.ledgerAccount.create({
    data: {
      companyId: params.companyId,
      kind: params.kind,
      currency: params.currency,
      name: params.name,
    },
  });
}

type Prisma_TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Valida e regista um lote de lançamentos de ledger dentro de UMA transação
 * de base de dados. Rejeita lotes desequilibrados (soma debit != soma credit
 * por moeda) — isto é o que impede saldos inconsistentes.
 */
export async function postLedgerBatch(batch: PostingBatch, tx?: Prisma_TxClient) {
  if (batch.lines.length < 2) {
    throw new Error("Um lote de ledger precisa de pelo menos 2 linhas (débito + crédito).");
  }

  const totalsByCurrency = new Map<string, { debit: Money; credit: Money }>();
  for (const line of batch.lines) {
    const t = totalsByCurrency.get(line.currency) ?? { debit: ZERO, credit: ZERO };
    if (line.direction === "DEBIT") t.debit = add(t.debit, line.amount);
    else t.credit = add(t.credit, line.amount);
    totalsByCurrency.set(line.currency, t);
  }

  for (const [currency, totals] of totalsByCurrency) {
    if (!totals.debit.equals(totals.credit)) {
      throw new Error(
        `Lote de ledger desequilibrado em ${currency}: débitos=${totals.debit} créditos=${totals.credit}. ` +
          `Operações multimoeda devem usar uma conta CLEARING para equilibrar cada perna.`
      );
    }
  }

  const run = async (db: Prisma_TxClient) => {
    return Promise.all(
      batch.lines.map((line) =>
        db.ledgerEntry.create({
          data: {
            ledgerAccountId: line.ledgerAccountId,
            direction: line.direction,
            amount: money(line.amount).toFixed(6),
            currency: line.currency,
            operationId: batch.operationId,
            reference: line.reference,
            memo: line.memo,
          },
        })
      )
    );
  };

  if (tx) return run(tx);
  return prisma.$transaction((trx) => run(trx));
}

/** Saldo atual de uma LedgerAccount = soma(credit) - soma(debit). */
export async function getLedgerAccountBalance(ledgerAccountId: string): Promise<Money> {
  const [credits, debits] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { ledgerAccountId, direction: "CREDIT" },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { ledgerAccountId, direction: "DEBIT" },
      _sum: { amount: true },
    }),
  ]);
  return sub(credits._sum.amount ?? 0, debits._sum.amount ?? 0);
}

/**
 * Saldo agregado de todas as LedgerAccounts de uma empresa de um determinado
 * tipo (kind), opcionalmente convertido para uma moeda de referência.
 * Usado pelo Dashboard para capital total, capital de giro, poupanças, etc.
 */
export async function getCompanyBalanceByKind(companyId: string, kind: LedgerAccountKind) {
  const accounts = await prisma.ledgerAccount.findMany({
    where: { companyId, kind },
  });

  const balances = await Promise.all(
    accounts.map(async (acc) => ({
      currency: acc.currency,
      balance: await getLedgerAccountBalance(acc.id),
    }))
  );

  const byCurrency = new Map<string, Money>();
  for (const b of balances) {
    byCurrency.set(b.currency, add(byCurrency.get(b.currency) ?? ZERO, b.balance));
  }
  return byCurrency;
}

/** Estorno de um lançamento — nunca apagar. Cria o lançamento inverso e liga-o ao original. */
export async function reverseLedgerEntry(entryId: string, reason: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.ledgerEntry.findUniqueOrThrow({ where: { id: entryId } });
    if (original.reversedById) {
      throw new Error("Este lançamento já foi estornado.");
    }
    const reversal = await tx.ledgerEntry.create({
      data: {
        ledgerAccountId: original.ledgerAccountId,
        direction: original.direction === "DEBIT" ? "CREDIT" : "DEBIT",
        amount: original.amount,
        currency: original.currency,
        operationId: original.operationId,
        reference: original.reference,
        memo: `Estorno: ${reason}`,
        reversalOfId: original.id,
      },
    });
    await tx.ledgerEntry.update({
      where: { id: original.id },
      data: { reversedById: reversal.id },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "LedgerEntry",
        entityId: original.id,
        action: "REVERSE",
        reason,
        previousValue: { amount: original.amount.toString(), direction: original.direction },
        newValue: { reversalId: reversal.id },
      },
    });
    return reversal;
  });
}
