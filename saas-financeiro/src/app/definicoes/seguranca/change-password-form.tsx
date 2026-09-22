"use client";

import { useActionState } from "react";
import { changeOwnPassword, type ChangeOwnPasswordState } from "@/server/auth/user-management-actions";

const initialState: ChangeOwnPasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeOwnPassword, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-neutral-700">Palavra-passe atual</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700">Nova palavra-passe</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">Palavra-passe alterada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50"
      >
        {pending ? "A guardar…" : "Alterar palavra-passe"}
      </button>
    </form>
  );
}
