"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const GOAL_TYPES = [
  "EMERGENCY_FUND",
  "NEW_COMPANY_CAPITAL",
  "EQUIPMENT",
  "EXPANSION",
  "INVESTMENT",
  "PERSONAL",
] as const;

const CreateSavingsGoalInput = z.object({
  companyId: z.string(),
  type: z.enum(GOAL_TYPES),
  name: z.string().min(1),
  targetAmount: z.coerce.number().positive(),
  currency: z.string().min(1),
  targetDate: z.string().optional(),
});

export type CreateSavingsGoalState = { error?: string; success?: boolean };

export async function createSavingsGoal(
  _prevState: CreateSavingsGoalState,
  formData: FormData
): Promise<CreateSavingsGoalState> {
  const parsed = CreateSavingsGoalInput.safeParse({
    companyId: formData.get("companyId"),
    type: formData.get("type"),
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    currency: formData.get("currency"),
    targetDate: formData.get("targetDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  await prisma.savingsGoal.create({
    data: {
      companyId: data.companyId,
      type: data.type,
      name: data.name,
      targetAmount: data.targetAmount.toString(),
      currency: data.currency,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    },
  });

  revalidatePath("/poupancas");
  return { success: true };
}
