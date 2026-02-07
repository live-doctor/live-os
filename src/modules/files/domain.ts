import type { DirectoryContent } from "@/app/actions/filesystem";

export type FilesViewState = {
  path: string;
  content: DirectoryContent | null;
};
