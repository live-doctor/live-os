/**
 * Widget System Types
 * Inspired by Umbrel OS widget layout
 */

// Widget type identifiers
export type WidgetType =
  | "text-with-progress"
  | "three-stats"
  | "system-pills"
  | "four-stats"
  | "two-stats-gauge"
  | "network-stats"
  | "custom"
  | "text-with-buttons"
  | "list-widget"
  | "list-emoji"
  | "files-list"
  | "files-grid"
  | "weather"
  | "thermals";

// Base widget configuration
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  appId: string; // e.g., "homeio", "plex", "nextcloud"
  appName: string;
  appIcon: string;
  refreshInterval?: number; // in ms
}

// Widget data by type
export interface TextWithProgressData {
  title: string;
  value: string;
  subtext?: string;
  progress: number; // 0-100
  color?: string;
}

export interface StatItem {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
  icon?: string;
}

export interface ThreeStatsData {
  stats: [StatItem, StatItem, StatItem];
}

export interface SystemPillsData {
  stats: [StatItem, StatItem, StatItem];
}

export interface FourStatsData {
  stats: [StatItem, StatItem, StatItem, StatItem];
}

export interface GaugeStat {
  label: string;
  value: number; // 0-100
  displayValue: string;
  color?: string;
}

export interface TwoStatsGaugeData {
  stats: [GaugeStat, GaugeStat];
}

export interface NetworkWidgetData {
  uploadMbps: number;
  downloadMbps: number;
  interfaceName: string;
  ip4: string;
  connected: boolean;
}

export interface CustomWidgetData {
  title: string;
  body: string;
  accent?: string;
  updatedAt?: string;
}

export interface ButtonItem {
  id: string;
  label: string;
  icon?: string;
  action?: () => void;
}

export interface TextWithButtonsData {
  title: string;
  subtitle?: string;
  buttons: ButtonItem[];
}

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  rightText?: string;
}

export interface ListWidgetData {
  items: ListItem[];
  maxItems?: number;
}

export interface EmojiListItem {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
}

export interface ListEmojiData {
  items: EmojiListItem[];
  maxItems?: number;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  icon?: string;
  modifiedAt?: string;
}

export interface FilesListData {
  files: FileItem[];
  title?: string;
}

export interface FilesGridData {
  folders: FileItem[];
  title?: string;
}

export interface WeatherWidgetData {
  location: string;
  latitude: string;
  longitude: string;
}

export interface ThermalsWidgetData {
  cpuTemperature?: number | null;
  main?: number | null;
  max?: number | null;
  cores?: (number | null)[];
  socket?: (number | null)[];
}

// Union type for all widget data
export type WidgetData =
  | TextWithProgressData
  | ThreeStatsData
  | SystemPillsData
  | FourStatsData
  | TwoStatsGaugeData
  | NetworkWidgetData
  | CustomWidgetData
  | TextWithButtonsData
  | ListWidgetData
  | ListEmojiData
  | FilesListData
  | FilesGridData
  | WeatherWidgetData
  | ThermalsWidgetData;

// Complete widget with config and data
export interface WidgetInstance<T extends WidgetData = WidgetData> {
  config: WidgetConfig;
  data: T;
}

// Available widget definition (for selector)
export interface AvailableWidget {
  id: string;
  type: WidgetType;
  appId: string;
  appName: string;
  appIcon: string;
  name: string;
  description: string;
}

// Selected widget state
export interface SelectedWidget {
  id: string;
  order: number;
}

// Widget selector section
export interface WidgetSectionData {
  appId: string;
  appName: string;
  appIcon: string;
  widgets: AvailableWidget[];
}
