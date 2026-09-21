"use client";

import { useActionState } from "react";
import { createExpense, type CreateExpenseState } from "@/server/expenses/create-expense";

const initialState: CreateExpenseState = {};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "OPERATIONAL", label: "Operacionais" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ADVERTISING", label: "Publicidade" },
  { value: "SALARIES", label: "Salários" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "COMMISSIONS", label: "Comissões" },
  { value: "BANK_FEES", label: "Taxas bancárias" },
  { value: "PLATFORM_FEES", label: "Taxas de plataformas" },
  { value: "TECHNOLOGY", label: "Tecnologia" },
  { value: "OFFICE", label: "Escritório" },
  { value: "TAXES", label: "Impostos" },
  { value: "SUPPLIERS", label: "Fornecedores" },
  { value: "FINANCIAL", label: "Despesas financeiras" },
  { value: "OTHER", label: "Outras" },
];

type Source = { ledgerAccountId: string; label: string; companyId: string; currency: string };

export function NovaDespesaForm({ sources }: { sources: Source[] }) {
  const [state, formAction, pending] = useActionState(createExpense, initialState);

  function onSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const opt = e.target.selectedOptions[0];
    const form = e.target.form;
    if (!form) return;
    (form.elements.namedItem("companyId") as HTMLInputElement).value = opt.dataset.companyId ?? "";
    (form.elements.namedItem("currency") as HTMLInputElement).value = opt.dataset.currency ?? "";
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" defaultValue={sources[0]?.companyId ?? ""} />
      <input type="hidden" name="currency" defaultValue={sources[0]?.currency ?? ""} />

      <div>
        <label className="block text-sm font-medium text-neutral-700">Saiu de</label>
        <select name="accountLedgerId" required onChange={onSourceChange} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {sources.map((s) => (
            <option key={s.ledgerAccountId} value={s.ledgerAccountId} data-company-id={s.companyId} data-currency={s.currency}>
              {s.label} — {s.currency}
            </option>
          ))}
        </select>
        {sources.length === 0 && <p className="mt-1 text-xs text-red-600">Cria primeiro uma conta ou carteira.</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Categoria</label>
        <select name="category" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Descrição</label>
        <input name="description" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Valor</label>
        <input name="amount" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Método de pagamento</label>
        <input name="paymentMethod" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Transferência, Cartão" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.warning && <p className="text-sm text-gold-600">⚠ {state.warning}</p>}
      {state.success && !state.warning && <p className="text-sm text-emerald-600">Despesa registada.</p>}

      <button type="submit" disabled={pending || sources.length === 0} className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50">
        {pending ? "A registar…" : "Registar despesa"}
      </button>
    </form>
  );
}
