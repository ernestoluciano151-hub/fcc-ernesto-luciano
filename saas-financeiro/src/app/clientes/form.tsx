"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createCustomer, type CreateCustomerState } from "@/server/customers/create-customer";

const initialState: CreateCustomerState = {};

export function ClienteForm({ companies }: { companies: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createCustomer, initialState);
  const [type, setType] = useState<"INDIVIDUAL" | "BUSINESS">("INDIVIDUAL");

  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gold-300 bg-gold-50 p-4 text-sm text-gold-800">
        Ainda não tens nenhuma empresa criada. Cria primeiro uma empresa (pode ser &quot;Operações pessoais&quot;
        se não for uma empresa formal) para poderes associar clientes a ela.
        <Link href="/empresas" className="mt-2 block font-medium underline">
          Criar empresa →
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Empresa</label>
        <select name="companyId" required defaultValue="" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="" disabled>Seleciona a empresa</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Tipo de cliente</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as "INDIVIDUAL" | "BUSINESS")}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="INDIVIDUAL">Particular (pessoa singular)</option>
          <option value="BUSINESS">Empresarial (pessoa coletiva)</option>
        </select>
        <p className="mt-1 text-xs text-neutral-400">
          A maioria das operações de arbitragem com cartão (Visa/Mastercard) é com clientes particulares.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Nome</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">{type === "BUSINESS" ? "NIF" : "BI / Passaporte"}</label>
        <input name="documentId" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
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
