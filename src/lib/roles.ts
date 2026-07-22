import { SessionPayload } from "./auth";

export function isAdmin(session: SessionPayload): boolean {
  return session.role === "admin";
}

export function isStaff(session: SessionPayload): boolean {
  return session.role === "barber" || session.role === "admin";
}

export function hasBarberProfile(session: SessionPayload): boolean {
  return !!session.barberId;
}

export function canManageOwnAvailability(session: SessionPayload): boolean {
  return !!session.barberId;
}
