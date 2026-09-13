"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { add, money } from "@/lib/finance/money";

const RegisterUsageInput = z.object({
  limitAllocationId: z.string(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export type RegisterUsageState = { error?: string; success?: boolean };

export async function registerLimitUsage(
  _prevState: RegisterUsageState,
  formData: FormData
): Promise<RegisterUsageState> {
  const parsed = RegisterUsageInput.safeParse({
    limitAllocationId: formData.get("limitAllocationId"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const allocation = await prisma.limitAllocation.findUniqueOrThrow({ where: { id: data.limitAllocationId } });
  const newUsed = add(allocation.usedAmount, data.amount);

  if (newUsed.greaterThan(money(allocation.limitAmount))) {
    return { error: `Limite insuficiente: disponível ${money(allocation.limitAmount).minus(allocation.usedAmount.toString())} ${allocation.currency}.` };
  }

  await prisma.$transaction([
    prisma.limitUsage.create({
      data: { limitAllocationId: allocation.id, amount: data.amount.toString(), description: data.description },
    }),
    prisma.limitAllocation.update({
      where: { id: allocation.id },
      data: {
        usedAmount: newUsed.toFixed(6),
        status: newUsed.equals(money(allocation.limitAmount)) ? "EXHAUSTED" : "ACTIVE",
      },
    }),
  ]);

  revalidatePath("/plafond");
  return { success: true };
}
