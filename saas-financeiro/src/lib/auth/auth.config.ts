import type { NextAuthConfig } from "next-auth";

// ============================================================================
// Configuração "edge-safe": sem providers nem acesso a base de dados. É esta
// versão que corre no middleware (Edge Runtime). A configuração completa,
// com o provider de credenciais e Prisma, vive em auth.ts e só corre em
// runtime Node.js (rotas /api/auth/* e Server Actions).
// ============================================================================
export default {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname.startsWith("/login");

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
