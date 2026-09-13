"use client";

import { useActionState } from "react";
import { createCardOperation, type CardOperationState } from "@/server/cards/create-card-operation";

const initialState: CardOperationState = {};

export function NovoCartaoForm({
  companies,
  customers,
}: {
  companies: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createCardOperation, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Empresa</label>
          <select name="companyId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Cliente</label>
          <select name="customerId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Token/referência do cartão</label>
          <input name="cardToken" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: CARD-TOK-8823 (não o nº completo)" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Rede</label>
          <select name="network" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="OTHER">Outra</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Valor carregado</label>
          <input name="loadedAmount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Moeda</label>
          <select name="currency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="AOA">AOA</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Custo da operação</label>
          <input name="operationCost" type="number" step="0.01" defaultValue={0} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Comissão cobrada</label>
          <input name="commissionCharged" type="number" step="0.01" defaultValue={0} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Valor recebido do cliente</label>
        <input name="receivedAmount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Observações</label>
        <textarea name="notes" rows={2} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Operação {state.code} registada — lucro {state.profit}.</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "A registar…" : "Registar carregamento"}
      </button>
    </form>
  );
}
