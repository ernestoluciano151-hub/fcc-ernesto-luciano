"use server";

import { signOut, auth } from "@/lib/auth/auth";
import { logAudit } from "@/lib/auth/audit";

export async function signOutAction(): Promise<void> {
  const session = await auth();
  if (session?.user?.id) {
    await logAudit({ actorId: session.user.id, entityType: "User", entityId: session.user.id, action: "LOGOUT" });
  }
  await signOut({ redirectTo: "/login" });
}
