import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { logAudit } from "@/lib/auth/audit";
import authConfig from "@/lib/auth/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Palavra-passe", type: "password" },
        token: { label: "Código 2FA", type: "text" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        const token = typeof credentials?.token === "string" ? credentials.token.trim() : "";

        if (!email || !password) return null;

        // Limite de tentativas por email: 5 em 10 minutos.
        const allowed = checkRateLimit(`login:${email}`, 5, 10 * 60 * 1000);
        if (!allowed) {
          await logAudit({
            entityType: "User",
            entityId: email,
            action: "LOGIN_RATE_LIMITED",
          });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          await logAudit({ entityType: "User", entityId: email, action: "LOGIN_FAILED", reason: "utilizador inexistente ou inativo" });
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
          await logAudit({ actorId: user.id, entityType: "User", entityId: user.id, action: "LOGIN_FAILED", reason: "palavra-passe incorreta" });
          return null;
        }

        if (user.twoFactorEnabled) {
          if (!user.twoFactorSecret || !verifyTotpToken(user.twoFactorSecret, token)) {
            await logAudit({ actorId: user.id, entityType: "User", entityId: user.id, action: "LOGIN_FAILED", reason: "código 2FA inválido" });
            return null;
          }
        }

        await logAudit({ actorId: user.id, entityType: "User", entityId: user.id, action: "LOGIN_SUCCESS" });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
