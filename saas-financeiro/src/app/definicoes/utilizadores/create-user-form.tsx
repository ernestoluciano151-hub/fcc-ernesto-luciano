"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "@/server/auth/user-management-actions";

const ROLE_LABELS: Record<string, string> = {
  VIEWER: "Visualizador",
  OPERATOR: "Operador",
  MANAGER: "Gestor",
  FINANCE: "Financeiro",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super Administrador",
};

const initialState: CreateUserState = {};

export function CreateUserForm({ assignableRoles }: { assignableRoles: string[] }) {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Nome</label>
        <input name="name" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Email</label>
        <input name="email" type="email" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Palavra-passe inicial</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700">Papel</label>
        <select name="role" defaultValue="OPERATOR" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          {assignableRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role] ?? role}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mb-2 text-sm text-emerald-600">Utilizador criado.</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50"
        >
          {pending ? "A criar…" : "Criar utilizador"}
        </button>
      </div>
    </form>
  );
}
