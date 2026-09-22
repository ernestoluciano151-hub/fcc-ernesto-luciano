import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/auth/rbac";
import { TwoFactorForm } from "@/app/definicoes/seguranca/two-factor-form";
import { ChangePasswordForm } from "@/app/definicoes/seguranca/change-password-form";

export default async function SegurancaPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: currentUser.id } });
  if (!user) redirect("/login");

  const canManageUsers = can(user.role, "MANAGE_USERS");

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Segurança da conta</h1>
          <p className="mt-1 text-sm text-neutral-500">{user.name} · {user.email} · {user.role}</p>
        </div>
        {canManageUsers && (
          <Link
            href="/definicoes/utilizadores"
            className="rounded-md border border-gold-300 px-3 py-1.5 text-xs font-medium text-gold-800 hover:bg-gold-50"
          >
            Gerir utilizadores →
          </Link>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Alterar palavra-passe</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Recomendado logo após o primeiro login com a palavra-passe temporária.
        </p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Autenticação de dois fatores (2FA)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Adiciona uma camada extra de segurança ao login, exigindo um código temporário
          gerado por uma app de autenticação além da palavra-passe.
        </p>
        <div className="mt-4">
          <TwoFactorForm enabled={user.twoFactorEnabled} />
        </div>
      </div>
    </div>
  );
}
