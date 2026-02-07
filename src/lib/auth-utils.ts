import { prisma } from "@/lib/prisma";

export async function hasUsersRaw(): Promise<boolean> {
  const count = await prisma.user.count();
  return count > 0;
}

export interface SessionAuthUser {
  id: string;
  username: string;
  role: string;
}

export function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");
    if (!rawName || rawValueParts.length === 0) continue;
    if (rawName !== cookieName) continue;

    const rawValue = rawValueParts.join("=");
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export async function getUserBySessionTokenRaw(
  sessionToken: string,
): Promise<SessionAuthUser | null> {
  if (!sessionToken) return null;

  const session = await prisma.session.findUnique({
    where: {
      token: sessionToken,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!session) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
  };
}
