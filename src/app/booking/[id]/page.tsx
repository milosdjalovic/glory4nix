import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import BookingConfirmation from "@/components/BookingConfirmation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPage({ params }: PageProps) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      barber: { select: { name: true, accentColor: true } },
      service: { select: { name: true, price: true, durationMinutes: true } },
    },
  });

  if (!booking || booking.status === "cancelled") {
    notFound();
  }

  return (
    <BookingConfirmation
      booking={{
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: booking.customerName,
        barberName: booking.barber.name,
        barberColor: booking.barber.accentColor,
        serviceName: booking.service.name,
        price: booking.service.price,
        durationMinutes: booking.service.durationMinutes,
      }}
    />
  );
}
