"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { postLedgerBatch, getOrCreateLogicalLedgerAccount } from "@/lib/ledger/ledger-engine";
import { money, ZERO } from "@/lib/finance/money";

// ============================================================================
// Criar uma Account (bancária/cash/pagamento) SEMPRE cria em conjunto a
// LedgerAccount que a espelha, e — se houver saldo inicial — lança o
// lançamento de abertura contra uma conta de Equity. Assim o saldo mostrado
// em qualquer ecrã vem sempre do ledger, nunca do campo openingBalance isolado.
// ============================================================================

const CreateAccountInput = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  institution: z.string().optional(),
  type: z.enum(["BANK", "DIGITAL_WALLET", "CRYPTO_WALLET", "CASH", "PAYMENT_ACCOUNT"]),
  currency: z.string().min(1),
  openingBalance: z.coerce.number().default(0),
});

export type CreateAccountState = { error?: string; success?: boolean };

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const parsed = CreateAccountInput.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    institution: formData.get("institution") || undefined,
    type: formData.get("type"),
    currency: formData.get("currency"),
    openingBalance: formData.get("openingBalance") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        institution: data.institution,
        type: data.type,
        currency: data.currency,
        openingBalance: data.openingBalance.toString(),
      },
    });

    const ledgerAccount = await tx.ledgerAccount.create({
      data: {
        companyId: data.companyId,
        kind: "BANK_ACCOUNT",
        currency: data.currency,
        name: `${data.name} (${data.currency})`,
        accountId: account.id,
      },
    });

    const balance = money(data.openingBalance);
    if (!balance.equals(ZERO)) {
      const equity = await getOrCreateLogicalLedgerAccount({
        companyId: data.companyId,
        kind: "EQUITY",
        currency: data.currency,
        name: `Capital inicial (${data.currency})`,
        tx,
      });

      const isPositive = balance.isPositive();
      await postLedgerBatch(
        {
          lines: [
            {
              ledgerAccountId: ledgerAccount.id,
              direction: isPositive ? "DEBIT" : "CREDIT",
              amount: balance.abs(),
              currency: data.currency,
              memo: "Saldo de abertura",
            },
            {
              ledgerAccountId: equity.id,
              direction: isPositive ? "CREDIT" : "DEBIT",
              amount: balance.abs(),
              currency: data.currency,
              memo: "Saldo de abertura",
            },
          ],
        },
        tx
      );
    }
  });

  revalidatePath("/contas");
  return { success: true };
}
