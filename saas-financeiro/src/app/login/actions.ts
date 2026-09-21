"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";

export type LoginState = { error?: string };

export async function authenticate(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      token: formData.get("token") ?? "",
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email, palavra-passe ou código 2FA incorretos." };
    }
    // O redirecionamento de sucesso do Auth.js é lançado como um erro especial
    // (NEXT_REDIRECT) — tem de ser propagado, não tratado como falha de login.
    throw error;
  }
}
