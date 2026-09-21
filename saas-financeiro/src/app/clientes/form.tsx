"use client";

import { useActionState } from "react";
import { createCustomer, type CreateCustomerState } from "@/server/customers/create-customer";

const initialState: CreateCustomerState = {};

export function ClienteForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createCustomer, initialState);

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
        <label className="block text-sm font-medium text-neutral-700">Nome</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Contacto</label>
        <input name="contact" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="Telefone ou email" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Risco</label>
        <select name="risk" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="LOW">Baixo</option>
          <option value="MEDIUM">Médio</option>
          <option value="HIGH">Alto</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Cliente criado.</p>}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50">
        {pending ? "A criar…" : "Criar cliente"}
      </button>
    </form>
  );
}
