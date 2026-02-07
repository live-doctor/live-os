import { describe, expect, it } from "vitest";
import { checkMutationPolicy } from "@/modules/files/domain/operations-policy";

describe("operations policy", () => {
  it("blocks destructive operations on home root", () => {
    const result = checkMutationPolicy("delete", "/DATA", "/DATA");
    expect(result.allowed).toBe(false);
    expect(result.error).toBe("This operation is not allowed on home root");
  });

  it("allows non-destructive root operations", () => {
    const result = checkMutationPolicy("create", "/DATA", "/DATA");
    expect(result.allowed).toBe(true);
  });

  it("allows operations on child paths", () => {
    const result = checkMutationPolicy("delete", "/DATA/Documents", "/DATA");
    expect(result.allowed).toBe(true);
  });
});

