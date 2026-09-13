"use client";

import { useActionState } from "react";
import { createCompany, type CreateCompanyState } from "@/server/companies/create-company";

const initialState: CreateCompanyState = {};

export function EmpresaForm() {
  const [state, formAction, pending] = useActionState(createCompany, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Nome</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Ex: Empresa A" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">NIF</label>
        <input name="taxId" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Moeda principal</label>
        <select name="baseCurrency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="AOA">AOA</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input id="isPersonal" name="isPersonal" type="checkbox" className="h-4 w-4" />
        <label htmlFor="isPersonal" className="text-sm text-neutral-700">
          É "Operações pessoais" (não é uma empresa formal)
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Empresa criada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "A criar…" : "Criar empresa"}
      </button>
    </form>
  );
}
