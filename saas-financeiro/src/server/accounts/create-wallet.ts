"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { postLedgerBatch, getOrCreateLogicalLedgerAccount } from "@/lib/ledger/ledger-engine";
import { money, ZERO } from "@/lib/finance/money";

const CreateWalletInput = z.object({
  companyId: z.string(),
  name: z.string().min(1),
  currency: z.string().min(1),
  isCrypto: z.coerce.boolean().default(false),
  openingBalance: z.coerce.number().default(0),
});

export type CreateWalletState = { error?: string; success?: boolean };

export async function createWallet(
  _prevState: CreateWalletState,
  formData: FormData
): Promise<CreateWalletState> {
  const parsed = CreateWalletInput.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    currency: formData.get("currency"),
    isCrypto: formData.get("isCrypto") === "on",
    openingBalance: formData.get("openingBalance") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        currency: data.currency,
        isCrypto: data.isCrypto,
        openingBalance: data.openingBalance.toString(),
      },
    });

    const ledgerAccount = await tx.ledgerAccount.create({
      data: {
        companyId: data.companyId,
        kind: "WALLET",
        currency: data.currency,
        name: `${data.name} (${data.currency})`,
        walletId: wallet.id,
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

  revalidatePath("/carteiras");
  return { success: true };
}
