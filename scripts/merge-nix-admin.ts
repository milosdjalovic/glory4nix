import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const nixBarber = await prisma.barber.findUnique({ where: { slug: "nix" } });
  if (!nixBarber) {
    console.log("Nix barber not found — run seed first.");
    return;
  }

  await prisma.admin.deleteMany({ where: { username: "admin" } });

  const nixAdmin = await prisma.admin.findUnique({ where: { username: "nix" } });

  if (nixAdmin) {
    await prisma.admin.update({
      where: { username: "nix" },
      data: { role: "admin", barberId: nixBarber.id },
    });
    console.log("Nix updated to admin + barber.");
  } else {
    await prisma.admin.create({
      data: {
        username: "nix",
        passwordHash: await bcrypt.hash(
          process.env.ADMIN_PASSWORD || "glory4nix2024",
          12
        ),
        role: "admin",
        barberId: nixBarber.id,
      },
    });
    console.log("Nix admin account created.");
  }

  console.log("Done. Login: nix / (existing password or glory4nix2024 if new)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
