import type { SessionAuthUser } from "@/lib/auth-utils";
import {
  getCookieValue,
  getUserBySessionTokenRaw,
} from "@/lib/auth-utils";
import { SESSION_COOKIE_NAME } from "@/lib/config";
import type { IncomingMessage } from "http";

export async function authenticateTerminalUpgrade(
  request: IncomingMessage,
  resolveUser: (sessionToken: string) => Promise<SessionAuthUser | null> = getUserBySessionTokenRaw,
): Promise<SessionAuthUser | null> {
  const cookieHeader =
    typeof request.headers.cookie === "string" ? request.headers.cookie : undefined;
  const sessionToken = getCookieValue(cookieHeader, SESSION_COOKIE_NAME);
  if (!sessionToken) return null;

  try {
    return await resolveUser(sessionToken);
  } catch (error) {
    console.error("Terminal auth failed:", error);
    return null;
  }
}
