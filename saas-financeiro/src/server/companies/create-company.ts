"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const CreateCompanyInput = z.object({
  name: z.string().min(1),
  taxId: z.string().optional(),
  baseCurrency: z.string().min(1),
  isPersonal: z.coerce.boolean().default(false),
});

export type CreateCompanyState = { error?: string; success?: boolean };

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData
): Promise<CreateCompanyState> {
  const parsed = CreateCompanyInput.safeParse({
    name: formData.get("name"),
    taxId: formData.get("taxId") || undefined,
    baseCurrency: formData.get("baseCurrency"),
    isPersonal: formData.get("isPersonal") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  await prisma.company.create({ data: parsed.data });

  revalidatePath("/empresas");
  revalidatePath("/contas/nova");
  revalidatePath("/carteiras/nova");
  return { success: true };
}
