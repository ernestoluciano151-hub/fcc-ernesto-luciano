"use client";

import { useActionState } from "react";
import { updateMinCapital, type UpdateMinCapitalState } from "@/server/settings/update-min-capital";

const initialState: UpdateMinCapitalState = {};

export function MinCapitalForm({ companies }: { companies: { id: string; name: string; minRecommendedCapital: string }[] }) {
  const [state, formAction, pending] = useActionState(updateMinCapital, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Empresa</label>
        <select
          name="companyId"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          onChange={(e) => {
            const opt = e.target.selectedOptions[0];
            const input = e.target.form?.elements.namedItem("minRecommendedCapital") as HTMLInputElement | null;
            if (input) input.value = opt.dataset.current ?? "0";
          }}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id} data-current={c.minRecommendedCapital}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Capital mínimo recomendado</label>
        <input
          name="minRecommendedCapital"
          type="number"
          step="0.01"
          defaultValue={companies[0]?.minRecommendedCapital ?? "0"}
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Atualizado.</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "A guardar…" : "Guardar"}
      </button>
    </form>
  );
}
