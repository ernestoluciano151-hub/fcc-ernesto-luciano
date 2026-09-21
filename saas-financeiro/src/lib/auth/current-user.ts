import { auth } from "@/lib/auth/auth";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Sessão inválida ou expirada. Inicia sessão novamente.");
  }
  return session.user.id;
}
