import type { DockerOverview } from "./domain";

export function hasRunningApps(overview: DockerOverview) {
  return overview.installedApps.some((app) => app.status === "running");
}
