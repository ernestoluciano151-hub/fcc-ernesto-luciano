import Link from "next/link";

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
  { href: "/capital-giro", label: "Capital de Giro" },
  { href: "/reconciliacao", label: "Reconciliação" },
];

export function NavSidebar() {
  return (
    <nav className="w-56 shrink-0 border-r border-neutral-200 bg-white p-4">
      <p className="px-2 text-sm font-semibold text-neutral-900">Financial Command Center</p>
      <ul className="mt-4 space-y-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
