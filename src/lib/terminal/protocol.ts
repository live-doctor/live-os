export const SAFE_CONTAINER_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export type ResizeMessage = {
  type: "resize";
  cols?: number;
  rows?: number;
};

export type AttachMessage = {
  type: "attach";
  target: string;
};

export type InputMessage = {
  type: "input";
  data: string;
};

export type TerminalClientMessage = ResizeMessage | AttachMessage | InputMessage;

export function isSafeContainerName(containerName: string): boolean {
  return SAFE_CONTAINER_NAME.test(containerName);
}

export function buildDockerAttachCommand(containerName: string): string {
  if (!isSafeContainerName(containerName)) {
    throw new Error("Invalid container name.");
  }

  return `docker exec -it -- ${containerName} /bin/sh\n`;
}

export function parseTerminalClientMessage(raw: string): TerminalClientMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<TerminalClientMessage>;
    if (!parsed?.type || typeof parsed.type !== "string") {
      return null;
    }

    if (parsed.type === "resize") {
      return {
        type: "resize",
        cols: typeof parsed.cols === "number" ? parsed.cols : undefined,
        rows: typeof parsed.rows === "number" ? parsed.rows : undefined,
      };
    }

    if (parsed.type === "attach") {
      if (typeof parsed.target !== "string") return null;
      return { type: "attach", target: parsed.target };
    }

    if (parsed.type === "input") {
      if (typeof parsed.data !== "string") return null;
      return { type: "input", data: parsed.data };
    }

    return null;
  } catch {
    return null;
  }
}
