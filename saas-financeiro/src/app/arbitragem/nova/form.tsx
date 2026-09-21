"use client";

import { useActionState, useMemo, useState } from "react";
import { createArbitrageOperation, type ArbitrageState } from "@/server/operations/create-arbitrage-operation";

const initialState: ArbitrageState = {};

export function NovaArbitragemForm({
  companies,
  customers,
}: {
  companies: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createArbitrageOperation, initialState);

  const [capitalUsed, setCapitalUsed] = useState(0);
  const [finalRevenue, setFinalRevenue] = useState(0);
  const [costs, setCosts] = useState(0);
  const [commissions, setCommissions] = useState(0);
  const [fees, setFees] = useState(0);

  const preview = useMemo(() => {
    const totalCosts = costs + commissions + fees;
    const grossProfit = finalRevenue - capitalUsed;
    const netProfit = grossProfit - totalCosts;
    const roi = capitalUsed > 0 ? (netProfit / capitalUsed) * 100 : 0;
    const margin = finalRevenue > 0 ? (netProfit / finalRevenue) * 100 : 0;
    return { netProfit, roi, margin };
  }, [capitalUsed, finalRevenue, costs, commissions, fees]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Empresa</label>
          <select name="companyId" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Cliente/contraparte (opcional)</label>
          <select name="customerId" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Moeda de origem</label>
          <select name="originCurrency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="AOA">AOA</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Moeda de destino</label>
          <select name="destCurrency" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="AOA">AOA</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Capital utilizado</label>
          <input name="capitalUsed" type="number" step="0.01" required value={capitalUsed} onChange={(e) => setCapitalUsed(Number(e.target.value))} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Taxa de compra</label>
          <input name="buyRate" type="number" step="0.0001" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Taxa de venda</label>
          <input name="sellRate" type="number" step="0.0001" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Quantidade</label>
        <input name="quantity" type="number" step="0.000001" required className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Custos</label>
          <input name="costs" type="number" step="0.01" defaultValue={0} onChange={(e) => setCosts(Number(e.target.value))} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Comissões</label>
          <input name="commissions" type="number" step="0.01" defaultValue={0} onChange={(e) => setCommissions(Number(e.target.value))} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Taxas</label>
          <input name="fees" type="number" step="0.01" defaultValue={0} onChange={(e) => setFees(Number(e.target.value))} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Receita final</label>
        <input name="finalRevenue" type="number" step="0.01" required value={finalRevenue} onChange={(e) => setFinalRevenue(Number(e.target.value))} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Contraparte (texto livre)</label>
        <input name="counterparty" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>

      <div className="rounded-lg bg-neutral-50 p-4 text-sm">
        <p className="font-medium text-neutral-700">Pré-visualização (calculado no ecrã — o valor oficial é sempre recalculado no servidor):</p>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div>
            <p className="text-neutral-500">Lucro líquido</p>
            <p className={`font-semibold tabular-nums ${preview.netProfit < 0 ? "text-red-600" : "text-emerald-700"}`}>{preview.netProfit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-neutral-500">Margem</p>
            <p className="font-semibold tabular-nums">{preview.margin.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-neutral-500">ROI</p>
            <p className="font-semibold tabular-nums">{preview.roi.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600">
          Operação {state.code} registada — lucro líquido {state.netProfit}, ROI {state.roiPercent}%.
        </p>
      )}

      <button type="submit" disabled={pending} className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-black hover:bg-gold-500 disabled:opacity-50">
        {pending ? "A registar…" : "Registar operação"}
      </button>
    </form>
  );
}
