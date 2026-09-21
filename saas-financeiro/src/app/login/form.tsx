"use client";

import { useActionState, useState } from "react";
import { authenticate, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(authenticate, initialState);
  const [needsToken, setNeedsToken] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Email</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Palavra-passe</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setNeedsToken((v) => !v)}
          className="text-xs text-gold-700 underline"
        >
          {needsToken ? "Ocultar código 2FA" : "Tenho autenticação de dois fatores ativa"}
        </button>
        {needsToken && (
          <input
            name="token"
            inputMode="numeric"
            maxLength={6}
            placeholder="Código de 6 dígitos"
            className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50"
      >
        {pending ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
