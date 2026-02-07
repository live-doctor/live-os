export interface FileSystemItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
  permissions: string;
  isHidden: boolean;
  isMount?: boolean;
  displayName?: string;
}

export interface DirectoryContent {
  currentPath: string;
  items: FileSystemItem[];
  parent: string | null;
}

export type DefaultDirectory = {
  name: string;
  path: string;
};

export interface SearchResult {
  items: FileSystemItem[];
  total: number;
  hasMore: boolean;
}

export type ValidatePathResult = {
  valid: boolean;
  sanitized: string;
};

export type ActionResult = {
  success: boolean;
  error?: string;
};

export type DiskUsageResult = {
  size: string;
  error?: string;
};

export type FileContentResult = {
  content: string;
  error?: string;
};

export type TrashInfo = {
  path: string;
  itemCount: number;
  totalSize: number;
};

export type EmptyTrashResult = {
  success: boolean;
  deletedCount: number;
  error?: string;
};
