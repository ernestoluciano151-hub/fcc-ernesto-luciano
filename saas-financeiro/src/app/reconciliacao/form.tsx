"use client";

import { useActionState } from "react";
import { createReconciliation, type ReconciliationState } from "@/server/reconciliation/create-reconciliation";

const initialState: ReconciliationState = {};

export function ReconciliationForm({
  accounts,
}: {
  accounts: { id: string; name: string; companyId: string; companyName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createReconciliation, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Conta</label>
        <select
          name="accountId"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          onChange={(e) => {
            const opt = e.target.selectedOptions[0];
            const hidden = e.target.form?.elements.namedItem("companyId") as HTMLInputElement | null;
            if (hidden) hidden.value = opt.dataset.companyId ?? "";
          }}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id} data-company-id={a.companyId}>
              {a.name} — {a.companyName}
            </option>
          ))}
        </select>
        <input type="hidden" name="companyId" value={accounts[0]?.companyId ?? ""} />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Saldo real (extrato)</label>
        <input name="realBalance" type="number" step="0.01" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Observações</label>
        <textarea name="notes" rows={2} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Reconciliação registada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "A comparar…" : "Comparar saldos"}
      </button>
    </form>
  );
}
