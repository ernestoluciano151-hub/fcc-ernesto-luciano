import { prisma } from "@/lib/prisma";
import { getLedgerAccountBalance } from "@/lib/ledger/ledger-engine";
import { ZERO, type Money } from "@/lib/finance/money";

/** Saldo atual de uma Account (bancária/cash/pagamento), derivado do ledger. */
export async function getAccountBalance(accountId: string): Promise<Money> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { ledgerAccount: true },
  });
  if (!account?.ledgerAccount) return ZERO;
  return getLedgerAccountBalance(account.ledgerAccount.id);
}

/** Saldo atual de uma Wallet (digital/cripto), derivado do ledger. */
export async function getWalletBalance(walletId: string): Promise<Money> {
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: { ledgerAccount: true },
  });
  if (!wallet?.ledgerAccount) return ZERO;
  return getLedgerAccountBalance(wallet.ledgerAccount.id);
}

/** Lista todas as contas de uma empresa com saldo já calculado (para UI). */
export async function listAccountsWithBalance(companyId?: string) {
  const accounts = await prisma.account.findMany({
    where: companyId ? { companyId } : {},
    include: { ledgerAccount: true, company: true },
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(
    accounts.map(async (a) => ({
      ...a,
      balance: a.ledgerAccount ? await getLedgerAccountBalance(a.ledgerAccount.id) : ZERO,
    }))
  );
}

export async function listWalletsWithBalance(companyId?: string) {
  const wallets = await prisma.wallet.findMany({
    where: companyId ? { companyId } : {},
    include: { ledgerAccount: true, company: true },
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(
    wallets.map(async (w) => ({
      ...w,
      balance: w.ledgerAccount ? await getLedgerAccountBalance(w.ledgerAccount.id) : ZERO,
    }))
  );
}
