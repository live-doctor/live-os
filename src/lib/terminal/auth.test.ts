import { SESSION_COOKIE_NAME } from "@/lib/config";
import { authenticateTerminalUpgrade } from "@/lib/terminal/auth";
import type { IncomingMessage } from "http";
import { describe, expect, it, vi } from "vitest";

function createRequest(cookie?: string): IncomingMessage {
  return {
    headers: {
      cookie,
    },
  } as IncomingMessage;
}

describe("terminal websocket authentication", () => {
  it("rejects requests without session cookie", async () => {
    const resolver = vi.fn();
    const user = await authenticateTerminalUpgrade(createRequest(), resolver);

    expect(user).toBeNull();
    expect(resolver).not.toHaveBeenCalled();
  });

  it("resolves authenticated user from session cookie", async () => {
    const resolver = vi.fn().mockResolvedValue({
      id: "u_1",
      username: "ahmed",
      role: "USER",
    });

    const user = await authenticateTerminalUpgrade(
      createRequest(`${SESSION_COOKIE_NAME}=session-token-123; theme=dark`),
      resolver,
    );

    expect(resolver).toHaveBeenCalledWith("session-token-123");
    expect(user).toEqual({
      id: "u_1",
      username: "ahmed",
      role: "USER",
    });
  });

  it("returns null when token resolver fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const resolver = vi.fn().mockRejectedValue(new Error("db down"));
    const user = await authenticateTerminalUpgrade(
      createRequest(`${SESSION_COOKIE_NAME}=session-token-123`),
      resolver,
    );

    expect(user).toBeNull();
    consoleErrorSpy.mockRestore();
  });
});
