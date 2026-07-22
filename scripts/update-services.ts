import { PrismaClient } from "@prisma/client";
import { SERVICES } from "../src/lib/services-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.service.updateMany({ data: { active: false } });

  for (const svc of SERVICES) {
    await prisma.service.create({ data: { ...svc, active: true } });
  }

  console.log(`Uspješno dodano ${SERVICES.length} usluga (€).`);
  console.log("Stare usluge su deaktivirane — postojeće rezervacije ostaju netaknute.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
