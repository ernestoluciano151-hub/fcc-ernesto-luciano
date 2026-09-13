"use client";

import { useActionState } from "react";
import { createAccount, type CreateAccountState } from "@/server/accounts/create-account";

const initialState: CreateAccountState = {};

export function NovaContaForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createAccount, initialState);

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
        <label className="block text-sm font-medium text-neutral-700">Nome da conta</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: BAI Principal" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Instituição</label>
        <input name="institution" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Banco BAI" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Tipo</label>
          <select name="type" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="BANK">Conta bancária</option>
            <option value="CASH">Caixa</option>
            <option value="PAYMENT_ACCOUNT">Conta de pagamento</option>
            <option value="DIGITAL_WALLET">Carteira digital</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Moeda</label>
          <select name="currency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="AOA">AOA</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Saldo inicial</label>
        <input
          name="openingBalance"
          type="number"
          step="0.01"
          defaultValue={0}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Conta criada com sucesso.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "A criar…" : "Criar conta"}
      </button>
    </form>
  );
}
