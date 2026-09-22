"use client";

import { useActionState, useState } from "react";
import {
  updateUserRole,
  toggleUserActive,
  resetUserPassword,
  type ResetPasswordState,
} from "@/server/auth/user-management-actions";

const ROLE_LABELS: Record<string, string> = {
  VIEWER: "Visualizador",
  OPERATOR: "Operador",
  MANAGER: "Gestor",
  FINANCE: "Financeiro",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super Administrador",
};

type Row = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
};

const initialResetState: ResetPasswordState = {};

export function UserRow({
  user,
  assignableRoles,
  isSelf,
  canManage,
}: {
  user: Row;
  assignableRoles: string[];
  isSelf: boolean;
  canManage: boolean;
}) {
  const [showReset, setShowReset] = useState(false);
  const [resetState, resetAction, resetPending] = useActionState(resetUserPassword, initialResetState);

  return (
    <tr className="border-t border-neutral-100 align-top">
      <td className="py-2 pr-3">
        <p className="text-sm font-medium text-neutral-900">
          {user.name} {isSelf && <span className="text-xs text-gold-700">(tu)</span>}
        </p>
        <p className="text-xs text-neutral-500">{user.email}</p>
        {user.twoFactorEnabled && <p className="text-[11px] text-emerald-600">2FA ativo</p>}
      </td>

      <td className="py-2 pr-3">
        {canManage && !isSelf ? (
          <form action={updateUserRole}>
            <input type="hidden" name="userId" value={user.id} />
            <select
              name="role"
              defaultValue={user.role}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
          </form>
        ) : (
          <span className="text-xs text-neutral-600">{ROLE_LABELS[user.role] ?? user.role}</span>
        )}
      </td>

      <td className="py-2 pr-3">
        {canManage && !isSelf ? (
          <form action={toggleUserActive}>
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              className={
                user.isActive
                  ? "rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  : "rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
              }
            >
              {user.isActive ? "Desativar" : "Ativar"}
            </button>
          </form>
        ) : (
          <span className={user.isActive ? "text-xs text-emerald-600" : "text-xs text-red-600"}>
            {user.isActive ? "Ativo" : "Inativo"}
          </span>
        )}
      </td>

      <td className="py-2">
        {canManage && (
          <div>
            <button
              type="button"
              onClick={() => setShowReset((v) => !v)}
              className="text-xs text-gold-700 underline"
            >
              {showReset ? "Cancelar" : "Repor palavra-passe"}
            </button>
            {showReset && (
              <form action={resetAction} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  required
                  placeholder="Nova palavra-passe"
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                />
                <button
                  type="submit"
                  disabled={resetPending}
                  className="rounded-md bg-gold-600 px-2 py-1 text-xs font-medium text-black hover:bg-gold-500 disabled:opacity-50"
                >
                  {resetPending ? "…" : "Repor"}
                </button>
              </form>
            )}
            {resetState.error && <p className="mt-1 text-xs text-red-600">{resetState.error}</p>}
            {resetState.success && <p className="mt-1 text-xs text-emerald-600">Palavra-passe reposta.</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
