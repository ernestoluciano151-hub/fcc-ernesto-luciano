"use client";

import { useActionState } from "react";
import { createSavingsGoal, type CreateSavingsGoalState } from "@/server/savings/create-savings-goal";

const initialState: CreateSavingsGoalState = {};

const TYPES: { value: string; label: string }[] = [
  { value: "EMERGENCY_FUND", label: "Fundo de emergência" },
  { value: "NEW_COMPANY_CAPITAL", label: "Capital para nova empresa" },
  { value: "EQUIPMENT", label: "Equipamento" },
  { value: "EXPANSION", label: "Expansão" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "PERSONAL", label: "Pessoal" },
];

export function PoupancaForm({ companies }: { companies: { id: string; name: string; baseCurrency: string }[] }) {
  const [state, formAction, pending] = useActionState(createSavingsGoal, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Empresa</label>
        <select name="companyId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Tipo de meta</label>
        <select name="type" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Nome da meta</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Reserva de emergência" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Valor alvo</label>
        <input name="targetAmount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Moeda</label>
        <select name="currency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="AOA">AOA</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Data alvo (opcional)</label>
        <input name="targetDate" type="date" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Meta criada.</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50">
        {pending ? "A criar…" : "Criar meta"}
      </button>
    </form>
  );
}
