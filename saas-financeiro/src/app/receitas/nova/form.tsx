"use client";

import { useActionState } from "react";
import { createRevenue, type CreateRevenueState } from "@/server/revenues/create-revenue";

const initialState: CreateRevenueState = {};

type Destination = { ledgerAccountId: string; label: string; companyId: string; currency: string };

export function NovaReceitaForm({
  companies,
  destinations,
}: {
  companies: { id: string; name: string }[];
  destinations: Destination[];
}) {
  const [state, formAction, pending] = useActionState(createRevenue, initialState);

  function onDestinationChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const opt = e.target.selectedOptions[0];
    const form = e.target.form;
    if (!form) return;
    (form.elements.namedItem("companyId") as HTMLInputElement).value = opt.dataset.companyId ?? "";
    (form.elements.namedItem("currency") as HTMLInputElement).value = opt.dataset.currency ?? "";
    const currencyLabel = form.querySelector("[data-currency-label]");
    if (currencyLabel) currencyLabel.textContent = opt.dataset.currency ?? "";
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" defaultValue={destinations[0]?.companyId ?? ""} />
      <input type="hidden" name="currency" defaultValue={destinations[0]?.currency ?? ""} />

      <div>
        <label className="block text-sm font-medium text-neutral-700">Entrou em</label>
        <select name="accountLedgerId" required onChange={onDestinationChange} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {destinations.map((d) => (
            <option key={d.ledgerAccountId} value={d.ledgerAccountId} data-company-id={d.companyId} data-currency={d.currency}>
              {d.label} — {d.currency}
            </option>
          ))}
        </select>
        {destinations.length === 0 && <p className="mt-1 text-xs text-red-600">Cria primeiro uma conta ou carteira.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Descrição</label>
        <input name="description" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Venda de serviço X" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Categoria</label>
        <input name="category" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Vendas, Serviços, Arbitragem" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Valor (<span data-currency-label>{destinations[0]?.currency}</span>)
        </label>
        <input name="amount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Receita registada.</p>}

      <button type="submit" disabled={pending || destinations.length === 0} className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50">
        {pending ? "A registar…" : "Registar receita"}
      </button>
    </form>
  );
}
