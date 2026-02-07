import { describe, expect, it } from "vitest";
import {
  buildDockerAttachCommand,
  isSafeContainerName,
  parseTerminalClientMessage,
} from "@/lib/terminal/protocol";

describe("terminal protocol", () => {
  it("parses resize messages", () => {
    const parsed = parseTerminalClientMessage(
      JSON.stringify({ type: "resize", cols: 120, rows: 40 }),
    );

    expect(parsed).toEqual({ type: "resize", cols: 120, rows: 40 });
  });

  it("parses attach messages", () => {
    const parsed = parseTerminalClientMessage(
      JSON.stringify({ type: "attach", target: "my_container" }),
    );

    expect(parsed).toEqual({ type: "attach", target: "my_container" });
  });

  it("returns null for malformed messages", () => {
    expect(parseTerminalClientMessage("not-json")).toBeNull();
    expect(parseTerminalClientMessage(JSON.stringify({ type: "attach" }))).toBeNull();
    expect(parseTerminalClientMessage(JSON.stringify({ type: "unknown" }))).toBeNull();
  });

  it("validates safe container names", () => {
    expect(isSafeContainerName("homeio-nginx")).toBe(true);
    expect(isSafeContainerName("mysql_8.0")).toBe(true);
    expect(isSafeContainerName("-bad-start")).toBe(false);
    expect(isSafeContainerName("name with spaces")).toBe(false);
    expect(isSafeContainerName("bad;rm -rf /")).toBe(false);
  });

  it("builds attach command only for safe names", () => {
    expect(buildDockerAttachCommand("homeio-app")).toBe(
      "docker exec -it -- homeio-app /bin/sh\n",
    );
    expect(() => buildDockerAttachCommand("bad;name")).toThrow(
      "Invalid container name.",
    );
  });
});
