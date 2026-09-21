"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r border-gold-900/40 bg-brand-black p-4">
      <div className="flex items-center gap-2 px-2">
        <span className="h-2 w-2 rounded-full bg-gold-400" />
        <p className="text-sm font-semibold tracking-wide text-gold-300">Financial Command Center</p>
      </div>
      <ul className="mt-5 space-y-0.5">
        {LINKS.map((l) => {
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
    </nav>
  );
}
