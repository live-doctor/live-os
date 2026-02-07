// Types
export type {
  WidgetType,
  WidgetConfig,
  WidgetData,
  WidgetInstance,
  AvailableWidget,
  SelectedWidget,
  WidgetSectionData,
  TextWithProgressData,
  ThreeStatsData,
  SystemPillsData,
  FourStatsData,
  TwoStatsGaugeData,
  NetworkWidgetData,
  CustomWidgetData,
  TextWithButtonsData,
  ListWidgetData,
  ListEmojiData,
  FilesListData,
  FilesGridData,
  WeatherWidgetData,
  ThermalsWidgetData,
} from "./types";

// Constants
export {
  MAX_WIDGETS,
  REFRESH_INTERVALS,
  DEFAULT_WIDGET_IDS,
  AVAILABLE_WIDGETS,
  getWidgetSections,
  WIDGET_COLORS,
} from "./constants";

// Components
export { WidgetContainer } from "./widget-container";
export { WidgetGrid } from "./widget-grid";
export { WidgetSelector } from "./widget-selector";
export { WidgetChecker } from "./widget-checker";
export { WidgetSection } from "./widget-section";

// Widget components
export {
  Widget,
  WeatherWidget,
  ThermalsWidget,
  NetworkStatsWidget,
  CustomWidget,
} from "./widgets";

// Shared components
export { StatText, ProgressArc, WidgetIcon } from "./shared";
