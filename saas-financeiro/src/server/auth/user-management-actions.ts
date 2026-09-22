"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth/current-user";
import { ROLE_RANK, can } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/auth/audit";

const ROLES = ["VIEWER", "OPERATOR", "MANAGER", "FINANCE", "ADMIN", "SUPER_ADMIN"] as const;

async function requireUserManager() {
  const user = await getCurrentUser();
  if (!user?.id || !user.role || !can(user.role as Role, "MANAGE_USERS")) {
    throw new Error("Não tens permissão para gerir utilizadores.");
  }
  return { id: user.id, role: user.role as Role };
}

// ----------------------------------------------------------------------------
// Criar utilizador
// ----------------------------------------------------------------------------

export type CreateUserState = { error?: string; success?: boolean };

const CreateUserInput = z.object({
  name: z.string().min(1, "Nome obrigatório."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres."),
  role: z.enum(ROLES),
});

export async function createUser(_prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const manager = await requireUserManager();

  const parsed = CreateUserInput.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const email = data.email.trim().toLowerCase();

  if (ROLE_RANK[data.role] > ROLE_RANK[manager.role]) {
    return { error: "Não podes atribuir um papel superior ao teu." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe um utilizador com este email." };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const newUser = await prisma.user.create({
    data: { name: data.name, email, passwordHash, role: data.role },
  });

  await logAudit({
    actorId: manager.id,
    entityType: "User",
    entityId: newUser.id,
    action: "USER_CREATED",
    reason: `role=${data.role}`,
  });

  revalidatePath("/definicoes/utilizadores");
  return { success: true };
}

// ----------------------------------------------------------------------------
// Alterar papel (role)
// ----------------------------------------------------------------------------

export async function updateUserRole(formData: FormData): Promise<void> {
  const manager = await requireUserManager();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!userId || !ROLES.includes(role as (typeof ROLES)[number])) return;
  if (userId === manager.id) return; // não altera o próprio papel por aqui
  if (ROLE_RANK[role] > ROLE_RANK[manager.role]) return; // não pode dar papel acima do seu

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (ROLE_RANK[target.role] > ROLE_RANK[manager.role]) return; // não mexe em quem está acima de si

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logAudit({
    actorId: manager.id,
    entityType: "User",
    entityId: userId,
    action: "USER_ROLE_CHANGED",
    reason: `novo role=${role}`,
  });

  revalidatePath("/definicoes/utilizadores");
}

// ----------------------------------------------------------------------------
// Ativar / desativar
// ----------------------------------------------------------------------------

export async function toggleUserActive(formData: FormData): Promise<void> {
  const manager = await requireUserManager();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === manager.id) return; // não se autodesativa

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (ROLE_RANK[target.role] > ROLE_RANK[manager.role]) return;

  await prisma.user.update({ where: { id: userId }, data: { isActive: !target.isActive } });
  await logAudit({
    actorId: manager.id,
    entityType: "User",
    entityId: userId,
    action: target.isActive ? "USER_DEACTIVATED" : "USER_ACTIVATED",
  });

  revalidatePath("/definicoes/utilizadores");
}

// ----------------------------------------------------------------------------
// Repor palavra-passe (feito por um administrador)
// ----------------------------------------------------------------------------

export type ResetPasswordState = { error?: string; success?: boolean };

export async function resetUserPassword(_prevState: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const manager = await requireUserManager();
  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "A nova palavra-passe deve ter pelo menos 8 caracteres." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Utilizador não encontrado." };
  if (ROLE_RANK[target.role] > ROLE_RANK[manager.role] && userId !== manager.id) {
    return { error: "Não tens permissão para repor a palavra-passe deste utilizador." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await logAudit({
    actorId: manager.id,
    entityType: "User",
    entityId: userId,
    action: "PASSWORD_RESET_BY_ADMIN",
  });

  revalidatePath("/definicoes/utilizadores");
  return { success: true };
}

// ----------------------------------------------------------------------------
// Alterar a própria palavra-passe (autoatendimento)
// ----------------------------------------------------------------------------

export type ChangeOwnPasswordState = { error?: string; success?: boolean };

const ChangeOwnPasswordInput = z.object({
  currentPassword: z.string().min(1, "Introduz a palavra-passe atual."),
  newPassword: z.string().min(8, "A nova palavra-passe deve ter pelo menos 8 caracteres."),
});

export async function changeOwnPassword(
  _prevState: ChangeOwnPasswordState,
  formData: FormData
): Promise<ChangeOwnPasswordState> {
  const userId = await getCurrentUserId();

  const parsed = ChangeOwnPasswordInput.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Palavra-passe atual incorreta." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await logAudit({ actorId: userId, entityType: "User", entityId: userId, action: "PASSWORD_CHANGED_SELF" });

  return { success: true };
}
