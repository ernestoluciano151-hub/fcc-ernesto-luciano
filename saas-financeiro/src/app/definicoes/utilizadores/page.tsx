import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { ROLE_RANK, can } from "@/lib/auth/rbac";
import { CreateUserForm } from "@/app/definicoes/utilizadores/create-user-form";
import { UserRow } from "@/app/definicoes/utilizadores/user-row";

const ALL_ROLES: Role[] = ["VIEWER", "OPERATOR", "MANAGER", "FINANCE", "ADMIN", "SUPER_ADMIN"];

export default async function UtilizadoresPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) redirect("/login");

  const role = (currentUser.role ?? "VIEWER") as Role;
  if (!can(role, "MANAGE_USERS")) {
    redirect("/definicoes/seguranca");
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const assignableRoles = ALL_ROLES.filter((r) => ROLE_RANK[r] <= ROLE_RANK[role]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-lg font-semibold text-neutral-900">Gestão de utilizadores</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cria contas, atribui papéis, ativa/desativa acessos e repõe palavras-passe.
      </p>

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Novo utilizador</h2>
        <div className="mt-3">
          <CreateUserForm assignableRoles={assignableRoles} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Utilizadores existentes</h2>
        <table className="mt-3 w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-400">
              <th className="pb-2 font-medium">Utilizador</th>
              <th className="pb-2 font-medium">Papel</th>
              <th className="pb-2 font-medium">Estado</th>
              <th className="pb-2 font-medium">Palavra-passe</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  isActive: u.isActive,
                  twoFactorEnabled: u.twoFactorEnabled,
                }}
                assignableRoles={assignableRoles}
                isSelf={u.id === currentUser.id}
                canManage={ROLE_RANK[u.role] <= ROLE_RANK[role]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
