"use client";

import { useActionState } from "react";
import { createSavingsContribution, type CreateSavingsContributionState } from "@/server/savings/create-savings-contribution";

const initialState: CreateSavingsContributionState = {};

type Source = { ledgerAccountId: string; label: string; currency: string };

export function AporteForm({ savingsGoalId, sources }: { savingsGoalId: string; sources: Source[] }) {
  const [state, formAction, pending] = useActionState(createSavingsContribution, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="savingsGoalId" value={savingsGoalId} />

      <div>
        <label className="block text-sm font-medium text-neutral-700">Tipo</label>
        <select name="type" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="DEPOSIT">Aporte (entra na poupança)</option>
          <option value="WITHDRAWAL">Retirada (sai da poupança)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Conta / carteira</label>
        <select name="accountLedgerId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {sources.map((s) => (
            <option key={s.ledgerAccountId} value={s.ledgerAccountId}>{s.label} — {s.currency}</option>
          ))}
        </select>
        {sources.length === 0 && <p className="mt-1 text-xs text-red-600">Cria primeiro uma conta ou carteira nesta moeda.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Valor</label>
        <input name="amount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Nota (opcional)</label>
        <input name="note" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Movimento registado.</p>}

      <button type="submit" disabled={pending || sources.length === 0} className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50">
        {pending ? "A registar…" : "Registar movimento"}
      </button>
    </form>
  );
}
