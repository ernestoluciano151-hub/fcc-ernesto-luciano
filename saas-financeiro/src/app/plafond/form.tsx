"use client";

import { useActionState } from "react";
import { createLimitAllocation, type CreateLimitState } from "@/server/limits/create-limit-allocation";

const initialState: CreateLimitState = {};

export function NovoLimiteForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createLimitAllocation, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Cliente</label>
        <select name="customerId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        {customers.length === 0 && <p className="mt-1 text-xs text-red-600">Cria primeiro um cliente.</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Limite</label>
          <input name="limitAmount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Início</label>
          <input name="startDate" type="date" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Fim (opcional)</label>
          <input name="endDate" type="date" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Comissão</label>
        <input name="commission" type="number" step="0.01" defaultValue={0} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Limite criado.</p>}

      <button type="submit" disabled={pending || customers.length === 0} className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50">
        {pending ? "A criar…" : "Criar limite"}
      </button>
    </form>
  );
}
