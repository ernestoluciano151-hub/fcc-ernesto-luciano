"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/current-user";

const UpdateMinCapitalInput = z.object({
  companyId: z.string(),
  minRecommendedCapital: z.coerce.number().min(0),
});

export type UpdateMinCapitalState = { error?: string; success?: boolean };

export async function updateMinCapital(
  _prevState: UpdateMinCapitalState,
  formData: FormData
): Promise<UpdateMinCapitalState> {
  const parsed = UpdateMinCapitalInput.safeParse({
    companyId: formData.get("companyId"),
    minRecommendedCapital: formData.get("minRecommendedCapital"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;

  const before = await prisma.company.findUniqueOrThrow({ where: { id: data.companyId } });

  await prisma.company.update({
    where: { id: data.companyId },
    data: { minRecommendedCapital: data.minRecommendedCapital.toString() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: await getCurrentUserId(),
      entityType: "Company",
      entityId: data.companyId,
      action: "UPDATE",
      reason: "Ajuste do capital mínimo recomendado",
      previousValue: { minRecommendedCapital: before.minRecommendedCapital.toString() },
      newValue: { minRecommendedCapital: data.minRecommendedCapital },
    },
  });

  revalidatePath("/capital-giro");
  return { success: true };
}
