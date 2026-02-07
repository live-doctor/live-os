import type { TerminalTarget } from "./domain";

export function findTerminalTarget(
  targets: TerminalTarget[],
  id: string,
): TerminalTarget | null {
  return targets.find((target) => target.id === id) ?? null;
}
