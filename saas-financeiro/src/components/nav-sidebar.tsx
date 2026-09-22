"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/server/auth/sign-out-action";
import { can } from "@/lib/auth/rbac";
import type { Role } from "@prisma/client";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/empresas", label: "Empresas" },
  { href: "/contas", label: "Contas" },
  { href: "/carteiras", label: "Carteiras" },
  { href: "/operacoes", label: "Operações" },
  { href: "/arbitragem", label: "Arbitragem" },
  { href: "/cartoes", label: "Cartões" },
  { href: "/plafond", label: "Plafond" },
  { href: "/clientes", label: "Clientes" },
  { href: "/receitas", label: "Receitas" },
  { href: "/despesas", label: "Despesas" },
  { href: "/poupancas", label: "Poupanças" },
  { href: "/capital-giro", label: "Capital de Giro" },
  { href: "/relatorios", label: "Relatórios (DRE)" },
  { href: "/relatorios/fluxo-caixa", label: "Fluxo de Caixa" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reconciliacao", label: "Reconciliação" },
  { href: "/definicoes/seguranca", label: "Segurança" },
];

const ADMIN_LINKS = [{ href: "/definicoes/utilizadores", label: "Utilizadores" }];

type NavUser = { name?: string | null; email?: string | null; role?: string } | null;

export function NavSidebar({ user }: { user?: NavUser }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const canManageUsers = !!user?.role && can(user.role as Role, "MANAGE_USERS");
  const links = canManageUsers ? [...LINKS, ...ADMIN_LINKS] : LINKS;

  return (
    <nav className="flex w-56 shrink-0 flex-col justify-between border-r border-gold-900/40 bg-brand-black p-4">
      <div>
        <div className="flex items-center gap-2 px-2">
          <span className="h-2 w-2 rounded-full bg-gold-400" />
          <p className="text-sm font-semibold tracking-wide text-gold-300">Financial Command Center</p>
        </div>
        <ul className="mt-5 space-y-0.5">
          {links.map((l) => {
            const isActive = pathname === l.href || (l.href !== "/dashboard" && pathname?.startsWith(l.href + "/"));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    isActive
                      ? "block rounded-md border-l-2 border-gold-400 bg-gold-900/30 px-2 py-1.5 text-sm font-medium text-gold-200"
                      : "block rounded-md border-l-2 border-transparent px-2 py-1.5 text-sm text-neutral-400 hover:border-gold-700 hover:bg-white/5 hover:text-gold-200"
                  }
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {user && (
        <div className="border-t border-gold-900/40 pt-3">
          <p className="truncate px-2 text-xs font-medium text-neutral-300">{user.name ?? user.email}</p>
          <p className="px-2 text-[11px] uppercase tracking-wide text-gold-500">{user.role}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-neutral-400 hover:bg-white/5 hover:text-red-400"
            >
              Terminar sessão
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
