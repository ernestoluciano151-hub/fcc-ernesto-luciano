"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/current-user";
import { generateTotpSecret, buildOtpAuthUri, verifyTotpToken } from "@/lib/auth/totp";
import { logAudit } from "@/lib/auth/audit";

export type GenerateTwoFactorState = { secret?: string; otpauthUri?: string; error?: string };

export async function generateTwoFactorSecret(
  _prevState: GenerateTwoFactorState,
  _formData: FormData
): Promise<GenerateTwoFactorState> {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret, twoFactorEnabled: false } });

  return { secret, otpauthUri: buildOtpAuthUri(secret, user.email) };
}

export type ConfirmTwoFactorState = { error?: string; success?: boolean };

export async function confirmTwoFactor(_prevState: ConfirmTwoFactorState, formData: FormData): Promise<ConfirmTwoFactorState> {
  const userId = await getCurrentUserId();
  const token = String(formData.get("token") ?? "").trim();

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.twoFactorSecret || !verifyTotpToken(user.twoFactorSecret, token)) {
    return { error: "Código inválido. Tenta novamente." };
  }

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  await logAudit({ actorId: userId, entityType: "User", entityId: userId, action: "TWO_FACTOR_ENABLED" });

  revalidatePath("/definicoes/seguranca");
  return { success: true };
}

export async function disableTwoFactor(): Promise<void> {
  const userId = await getCurrentUserId();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await logAudit({ actorId: userId, entityType: "User", entityId: userId, action: "TWO_FACTOR_DISABLED" });
  revalidatePath("/definicoes/seguranca");
}
