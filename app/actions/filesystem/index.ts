// Core filesystem operations
export {
  type FileSystemItem,
  type DirectoryContent,
  type DefaultDirectory,
  type SearchResult,
  getHomeRoot,
  readDirectory,
  createDirectory,
  deleteItem,
  renameItem,
  createFile,
  writeFileContent,
  getDiskUsage,
  readFileContent,
  getDefaultDirectories,
  openPath,
  moveItems,
  copyItems,
  getTrashPath,
  getTrashInfo,
  trashItem,
  emptyTrash,
  permanentDelete,
  compressItems,
  searchFiles,
  uncompressArchive,
} from "./filesystem";

// Favorites
export {
  getFavorites,
  addFavorite,
  removeFavorite,
  isFavorite,
} from "./favorites";

// SMB shares
export {
  type SmbShare,
  checkSambaStatus,
  listSmbShares,
  createSmbShare,
  removeSmbShare,
  getShareByPath,
} from "./smb-share";

// Network storage
export {
  type NetworkShare,
  type DiscoveredHost,
  listNetworkShares,
  discoverSmbHosts,
  discoverSharesOnServer,
  isLiveOSDevice,
  addNetworkShare,
  connectNetworkShare,
  disconnectNetworkShare,
  removeNetworkShare,
  getServerInfo,
  reconnectDisconnectedShares,
} from "./network-storage";
