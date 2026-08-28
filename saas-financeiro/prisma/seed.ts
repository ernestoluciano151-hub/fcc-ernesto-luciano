import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Moedas base
  await prisma.currency.createMany({
    data: [
      { code: "AOA", name: "Kwanza Angolano", symbol: "Kz", decimals: 2 },
      { code: "USD", name: "Dólar Americano", symbol: "$", decimals: 2 },
      { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
      { code: "USDT", name: "Tether", symbol: "₮", decimals: 6, isCrypto: true },
    ],
    skipDuplicates: true,
  });

  // Utilizador administrador
  const passwordHash = await bcrypt.hash("changeme123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@empresa.local" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@empresa.local",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  // Empresa exemplo
  const company = await prisma.company.upsert({
    where: { id: "seed-company-a" },
    update: {},
    create: {
      id: "seed-company-a",
      name: "Empresa A",
      baseCurrency: "AOA",
    },
  });

  await prisma.companyMember.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: {},
    create: { userId: admin.id, companyId: company.id, role: "SUPER_ADMIN" },
  });

  // Taxa de câmbio exemplo
  await prisma.exchangeRate.create({
    data: { fromCode: "EUR", toCode: "AOA", rate: "1150.00", source: "seed" },
  });

  console.log("Seed concluído. Login: admin@empresa.local / changeme123 (alterar imediatamente).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
