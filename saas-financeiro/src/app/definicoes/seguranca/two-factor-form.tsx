"use client";

import { useActionState } from "react";
import {
  generateTwoFactorSecret,
  confirmTwoFactor,
  disableTwoFactor,
  type GenerateTwoFactorState,
  type ConfirmTwoFactorState,
} from "@/server/auth/security-actions";

export function TwoFactorForm({ enabled }: { enabled: boolean }) {
  const [genState, genAction, genPending] = useActionState<GenerateTwoFactorState, FormData>(
    generateTwoFactorSecret,
    {}
  );
  const [confirmState, confirmAction, confirmPending] = useActionState<ConfirmTwoFactorState, FormData>(
    confirmTwoFactor,
    {}
  );

  if (enabled && !confirmState.success) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">Autenticação de dois fatores está ativa nesta conta.</p>
        <form action={disableTwoFactor}>
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
          >
            Desativar 2FA
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!genState.secret && (
        <form action={genAction}>
          <button
            type="submit"
            disabled={genPending}
            className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50"
          >
            {genPending ? "A gerar…" : "Ativar autenticação de dois fatores"}
          </button>
        </form>
      )}

      {genState.secret && (
        <div className="space-y-3 rounded-lg border border-gold-300 bg-gold-50 p-4">
          <p className="text-sm text-neutral-700">
            Adiciona esta conta na tua app de autenticação (Google Authenticator, Authy, 1Password…)
            introduzindo o código manualmente:
          </p>
          <code className="block break-all rounded bg-white px-3 py-2 text-sm font-mono text-neutral-900">
            {genState.secret}
          </code>
          <p className="text-xs text-neutral-500">URI: {genState.otpauthUri}</p>

          <form action={confirmAction} className="flex items-end gap-2 pt-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-700">Código de 6 dígitos</label>
              <input
                name="token"
                inputMode="numeric"
                maxLength={6}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={confirmPending}
              className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {confirmPending ? "A confirmar…" : "Confirmar"}
            </button>
          </form>
          {confirmState.error && <p className="text-sm text-red-600">{confirmState.error}</p>}
        </div>
      )}

      {confirmState.success && <p className="text-sm text-emerald-700">2FA ativado com sucesso.</p>}
    </div>
  );
}
