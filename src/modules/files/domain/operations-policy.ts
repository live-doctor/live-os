import path from "path";

export type MutationOperation =
  | "create"
  | "delete"
  | "rename"
  | "move"
  | "copy"
  | "write"
  | "trash"
  | "permanent-delete";

type PolicyResult = {
  allowed: boolean;
  error?: string;
};

const ROOT_LOCKED_OPERATIONS = new Set<MutationOperation>([
  "delete",
  "rename",
  "move",
  "trash",
  "permanent-delete",
]);

export function checkMutationPolicy(
  operation: MutationOperation,
  targetPath: string,
  homeRoot: string,
): PolicyResult {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedHome = path.resolve(homeRoot);

  if (resolvedTarget !== resolvedHome) {
    return { allowed: true };
  }

  if (ROOT_LOCKED_OPERATIONS.has(operation)) {
    return {
      allowed: false,
      error: "This operation is not allowed on home root",
    };
  }

  return { allowed: true };
}

