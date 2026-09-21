import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ============================================================================
// Rota de arranque, protegida por SETUP_TOKEN (variável de ambiente). Cria o
// primeiro utilizador administrador apenas se ainda não existir nenhum
// utilizador na base de dados. Depois de usada uma vez, fica sem efeito —
// pode-se remover a variável SETUP_TOKEN do Vercel para fechar o acesso.
// ============================================================================
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json({
      message: "Já existe pelo menos um utilizador. Nada foi criado.",
    });
  }

  const passwordHash = await bcrypt.hash("changeme123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@empresa.local",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  return NextResponse.json({
    message: "Utilizador administrador criado. Muda a palavra-passe imediatamente após o primeiro login.",
    email: admin.email,
    password: "changeme123",
  });
}
