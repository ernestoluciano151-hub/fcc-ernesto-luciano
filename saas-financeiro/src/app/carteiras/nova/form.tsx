"use client";

import { useActionState } from "react";
import { createWallet, type CreateWalletState } from "@/server/accounts/create-wallet";

const initialState: CreateWalletState = {};

export function NovaCarteiraForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createWallet, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Empresa</label>
        <select name="companyId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Nome da carteira</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Binance USDT" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Moeda</label>
          <select name="currency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="USDT">USDT</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="AOA">AOA</option>
          </select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input id="isCrypto" name="isCrypto" type="checkbox" defaultChecked className="h-4 w-4" />
          <label htmlFor="isCrypto" className="text-sm text-neutral-700">
            É ativo digital
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Saldo inicial</label>
        <input
          name="openingBalance"
          type="number"
          step="0.000001"
          defaultValue={0}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Carteira criada com sucesso.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "A criar…" : "Criar carteira"}
      </button>
    </form>
  );
}
