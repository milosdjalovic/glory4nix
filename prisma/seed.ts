import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import webpush from "web-push";
import "dotenv/config";
import { SERVICES } from "../src/lib/services-data";

const prisma = new PrismaClient();

const DEFAULT_SCHEDULE = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "19:00" },
  { dayOfWeek: 2, startTime: "09:00", endTime: "19:00" },
  { dayOfWeek: 3, startTime: "09:00", endTime: "19:00" },
  { dayOfWeek: 4, startTime: "09:00", endTime: "19:00" },
  { dayOfWeek: 5, startTime: "09:00", endTime: "19:00" },
  { dayOfWeek: 6, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isWorking: false },
];

async function main() {
  await prisma.booking.deleteMany();
  await prisma.blockedSlot.deleteMany();
  await prisma.closedDay.deleteMany();
  await prisma.closedPeriod.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.barberSchedule.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();

  const barbers = await Promise.all([
    prisma.barber.create({
      data: {
        name: "Nix",
        slug: "nix",
        phone: "+387611234567",
        accentColor: "#C4A265",
      },
    }),
    prisma.barber.create({
      data: {
        name: "Seki",
        slug: "seki",
        phone: "+387612345678",
        accentColor: "#8B9DC3",
      },
    }),
    prisma.barber.create({
      data: {
        name: "Ivan",
        slug: "ivan",
        phone: "+387613456789",
        accentColor: "#A0785A",
      },
    }),
  ]);

  for (const barber of barbers) {
    for (const sched of DEFAULT_SCHEDULE) {
      await prisma.barberSchedule.create({
        data: {
          barberId: barber.id,
          dayOfWeek: sched.dayOfWeek,
          startTime: sched.startTime,
          endTime: sched.endTime,
          isWorking: "isWorking" in sched ? sched.isWorking! : true,
        },
      });
    }
  }

  for (const svc of SERVICES) {
    await prisma.service.create({ data: { ...svc } });
  }

  const nixBarber = barbers.find((b) => b.slug === "nix")!;

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

  for (const barber of barbers.filter((b) => b.slug !== "nix")) {
    const password = process.env[`BARBER_${barber.slug.toUpperCase()}_PASSWORD`] || `${barber.slug}123`;
    await prisma.admin.create({
      data: {
        username: barber.slug,
        passwordHash: await bcrypt.hash(password, 12),
        role: "barber",
        barberId: barber.id,
      },
    });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    const vapidKeys = webpush.generateVAPIDKeys();
    console.log("\n=== VAPID Keys (dodaj u .env / Vercel) ===");
    console.log(`VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
    console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
    console.log("===========================================\n");
  }

  console.log("Seed completed!");
  console.log("Nix (admin): nix / glory4nix2024");
  console.log("Barberi: seki/seki123, ivan/ivan123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
