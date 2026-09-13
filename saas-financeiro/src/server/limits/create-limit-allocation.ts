"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ============================================================================
// Plafond / limite operacional (secção 8). Apenas gestão e registo — o
// sistema NUNCA executa operações automaticamente com base nisto, só
// acompanha limite disponibilizado vs utilizado.
// ============================================================================

const CreateLimitInput = z.object({
  customerId: z.string(),
  limitAmount: z.coerce.number().positive(),
  currency: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  commission: z.coerce.number().min(0).default(0),
});

export type CreateLimitState = { error?: string; success?: boolean };

export async function createLimitAllocation(
  _prevState: CreateLimitState,
  formData: FormData
): Promise<CreateLimitState> {
  const parsed = CreateLimitInput.safeParse({
    customerId: formData.get("customerId"),
    limitAmount: formData.get("limitAmount"),
    currency: formData.get("currency"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    commission: formData.get("commission") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  await prisma.limitAllocation.create({
    data: {
      customerId: data.customerId,
      limitAmount: data.limitAmount.toString(),
      currency: data.currency,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      commission: data.commission.toString(),
    },
  });

  revalidatePath("/plafond");
  return { success: true };
}
