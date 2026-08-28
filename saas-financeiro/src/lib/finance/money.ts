import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";

// ============================================================================
// MOTOR DE CÁLCULO FINANCEIRO — precisão decimal, nunca float.
// Toda a matemática monetária da aplicação passa por aqui.
// ============================================================================

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

export function money(value: Decimal.Value): Money {
  return new Decimal(value);
}

export const ZERO = money(0);

export function add(a: Decimal.Value, b: Decimal.Value): Money {
  return money(a).plus(b);
}

export function sub(a: Decimal.Value, b: Decimal.Value): Money {
  return money(a).minus(b);
}

export function mul(a: Decimal.Value, b: Decimal.Value): Money {
  return money(a).times(b);
}

export function div(a: Decimal.Value, b: Decimal.Value): Money {
  return money(a).dividedBy(b);
}

export function percent(part: Decimal.Value, whole: Decimal.Value): Money {
  const w = money(whole);
  if (w.isZero()) return ZERO;
  return money(part).dividedBy(w).times(100);
}

/**
 * Converte um valor de uma moeda para outra usando a taxa de câmbio mais
 * recente registada até `at` (ou agora). NUNCA sobrescreve o valor original —
 * devolve ambos: { original, converted, rate, rateEffectiveAt }.
 */
export async function convertCurrency(params: {
  amount: Decimal.Value;
  from: string;
  to: string;
  at?: Date;
}) {
  const { amount, from, to, at } = params;
  if (from === to) {
    return {
      original: money(amount),
      converted: money(amount),
      rate: money(1),
      rateEffectiveAt: at ?? new Date(),
    };
  }

  const rate = await prisma.exchangeRate.findFirst({
    where: {
      fromCode: from,
      toCode: to,
      effectiveAt: { lte: at ?? new Date() },
    },
    orderBy: { effectiveAt: "desc" },
  });

  if (!rate) {
    // Tenta o caminho inverso e inverte a taxa
    const inverse = await prisma.exchangeRate.findFirst({
      where: { fromCode: to, toCode: from, effectiveAt: { lte: at ?? new Date() } },
      orderBy: { effectiveAt: "desc" },
    });
    if (!inverse) {
      throw new Error(
        `Nenhuma taxa de câmbio encontrada para ${from} -> ${to}. Regista uma ExchangeRate antes de continuar.`
      );
    }
    const invertedRate = money(1).dividedBy(inverse.rate.toString());
    return {
      original: money(amount),
      converted: money(amount).times(invertedRate),
      rate: invertedRate,
      rateEffectiveAt: inverse.effectiveAt,
    };
  }

  return {
    original: money(amount),
    converted: money(amount).times(rate.rate.toString()),
    rate: money(rate.rate.toString()),
    rateEffectiveAt: rate.effectiveAt,
  };
}

export function formatMoney(value: Decimal.Value, currency: string, locale = "pt-PT"): string {
  const n = money(value).toNumber();
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
  } catch {
    // moedas não-ISO (ex: USDT) não são aceites pelo Intl — formata manualmente
    return `${n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${currency}`;
  }
}
