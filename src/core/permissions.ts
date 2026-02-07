import type { Role } from "@/app/generated/prisma/enums";

export function canManageSystem(role: Role | undefined | null) {
  return role === "ADMIN";
}

export function canManageApps(role: Role | undefined | null) {
  return role === "ADMIN" || role === "USER";
}

export function canUseTerminal(role: Role | undefined | null) {
  return role === "ADMIN" || role === "USER";
}
