import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sortBarbers } from "@/lib/barber-utils";

export async function GET() {
  const barbers = sortBarbers(
    await prisma.barber.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        accentColor: true,
      },
    })
  );
  return NextResponse.json(barbers);
}
