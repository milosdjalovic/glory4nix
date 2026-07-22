import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarberOrAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireBarberOrAdmin();
    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Nevalidna pretplata" }, { status: 400 });
    }

    const barberId = session.role === "barber" ? session.barberId! : req.nextUrl.searchParams.get("barberId");
    if (!barberId) {
      return NextResponse.json({ error: "barberId je obavezan" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: {
        barberId_endpoint: { barberId, endpoint },
      },
      create: {
        barberId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }
}

export async function GET() {
  const { getVapidPublicKey } = await import("@/lib/notifications");
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}
