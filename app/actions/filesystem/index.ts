// Core filesystem operations
export {
    compressItems, copyItems, createDirectory, createFile, deleteItem, emptyTrash, getDefaultDirectories, getDiskUsage, getHomeRoot, getTrashInfo, getTrashPath, moveItems, openPath, permanentDelete, readDirectory, readFileContent, renameItem, searchFiles, trashItem, uncompressArchive, writeFileContent, type DefaultDirectory, type DirectoryContent, type FileSystemItem, type SearchResult
} from "./filesystem";

// Favorites
export {
    addFavorite, getFavorites, isFavorite, removeFavorite
} from "./favorites";

// SMB shares
export {
    checkSambaStatus, createSmbShare, getShareByPath, listSmbShares, removeSmbShare, type SmbShare
} from "./smb-share";

// Network storage
export {
    addNetworkShare,
    connectNetworkShare,
    disconnectNetworkShare, discoverSharesOnServer, discoverSmbHosts, getServerInfo, isHOMEIODevice, listNetworkShares, reconnectDisconnectedShares, removeNetworkShare, type DiscoveredHost, type NetworkShare
} from "./network-storage";

