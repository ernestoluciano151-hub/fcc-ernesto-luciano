"use client";

import { useActionState } from "react";
import { registerLimitUsage, type RegisterUsageState } from "@/server/limits/register-limit-usage";

const initialState: RegisterUsageState = {};

export function UsoLimiteForm({ allocations }: { allocations: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(registerLimitUsage, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Limite</label>
        <select name="limitAllocationId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {allocations.map((a) => (<option key={a.id} value={a.id}>{a.label}</option>))}
        </select>
        {allocations.length === 0 && <p className="mt-1 text-xs text-neutral-400">Sem limites ativos.</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Valor utilizado</label>
        <input name="amount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Descrição</label>
        <input name="description" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Utilização registada.</p>}

      <button type="submit" disabled={pending || allocations.length === 0} className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "A registar…" : "Registar utilização"}
      </button>
    </form>
  );
}
