"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const CreateCustomerInput = z.object({
  companyId: z.string(),
  type: z.enum(["INDIVIDUAL", "BUSINESS"]).default("INDIVIDUAL"),
  name: z.string().min(1),
  documentId: z.string().optional(),
  contact: z.string().optional(),
  risk: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
});

export type CreateCustomerState = { error?: string; success?: boolean };

export async function createCustomer(
  _prevState: CreateCustomerState,
  formData: FormData
): Promise<CreateCustomerState> {
  const parsed = CreateCustomerInput.safeParse({
    companyId: formData.get("companyId"),
    type: formData.get("type") || "INDIVIDUAL",
    name: formData.get("name"),
    documentId: formData.get("documentId") || undefined,
    contact: formData.get("contact") || undefined,
    risk: formData.get("risk") || "LOW",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  await prisma.customer.create({ data: parsed.data });

  revalidatePath("/clientes");
  return { success: true };
}
