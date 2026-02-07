import type { SessionAuthUser } from "@/lib/auth-utils";
import { authenticateTerminalUpgrade } from "@/lib/terminal/auth";
import {
  buildDockerAttachCommand,
  parseTerminalClientMessage,
} from "@/lib/terminal/protocol";
import type { IncomingMessage, Server } from "http";
import * as pty from "node-pty";
import type { Duplex } from "stream";
import { WebSocket, WebSocketServer } from "ws";

type AuthenticatedWebSocket = WebSocket & { authUser?: SessionAuthUser };

let wss: WebSocketServer | null = null;

function rejectUpgrade(
  socket: Duplex,
  statusCode: number,
  statusText: string,
  message: string,
) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`,
  );
  socket.destroy();
}

export function initializeWebSocketServer(server: Server) {
  if (wss) {
    console.log("WebSocket server already initialized");
    return wss;
  }

  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(
      request.url || "",
      `http://${request.headers.host}`,
    ).pathname;
    if (pathname !== "/api/terminal") return;

    void (async () => {
      const user = await authenticateTerminalUpgrade(request);
      if (!user) {
        rejectUpgrade(socket, 401, "Unauthorized", "Authentication required.");
        return;
      }

      wss!.handleUpgrade(request, socket, head, (ws) => {
        const authenticatedWs = ws as AuthenticatedWebSocket;
        authenticatedWs.authUser = user;
        wss!.emit("connection", authenticatedWs, request);
      });
    })();
  });

  wss.on("connection", (ws) => {
    const authenticatedWs = ws as AuthenticatedWebSocket;
    if (!authenticatedWs.authUser) {
      authenticatedWs.close(1008, "Authentication required.");
      return;
    }

    console.log(`Terminal client connected: ${authenticatedWs.authUser.username}`);
    const shell = process.env.SHELL || "/bin/bash";

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || "/home",
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        } as Record<string, string>,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "failed to start shell";
      console.error("Terminal spawn failed:", error);
      try {
        authenticatedWs.send(`\r\nTerminal unavailable: ${reason}\r\n`);
      } catch {
        // no-op
      }
      authenticatedWs.close(1011, "Terminal unavailable");
      return;
    }

    ptyProcess.onData((data) => {
      if (authenticatedWs.readyState !== WebSocket.OPEN) return;
      try {
        authenticatedWs.send(data);
      } catch (error) {
        console.error("Error sending data to client:", error);
      }
    });

    authenticatedWs.on("message", (message: Buffer) => {
      try {
        const raw = message.toString();
        const parsed = parseTerminalClientMessage(raw);

        if (parsed?.type === "resize") {
          ptyProcess.resize(parsed.cols || 80, parsed.rows || 24);
          return;
        }

        if (parsed?.type === "attach") {
          if (parsed.target !== "host") {
            ptyProcess.write(buildDockerAttachCommand(parsed.target));
          }
          return;
        }

        if (parsed?.type === "input") {
          ptyProcess.write(parsed.data);
          return;
        }

        // Backward compatibility for legacy plaintext clients.
        ptyProcess.write(raw);
      } catch (error) {
        console.error("Error processing terminal message:", error);
      }
    });

    authenticatedWs.on("close", () => {
      console.log("Terminal client disconnected");
      ptyProcess.kill();
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Shell process exited with code ${exitCode}, signal ${signal}`);
      authenticatedWs.close();
    });

    authenticatedWs.on("error", (error) => {
      console.error("WebSocket error:", error);
      ptyProcess.kill();
    });
  });

  console.log("WebSocket terminal server initialized");
  return wss;
}

export function getWebSocketServer() {
  return wss;
}
