"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { WidgetData, WidgetType } from "./types";
import { Widget } from "./widgets";

interface WidgetGridProps {
  selectedIds: string[];
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  onWidgetClick?: (id: string) => void;
}

export function WidgetGrid({
  selectedIds,
  widgetData,
  onWidgetClick,
}: WidgetGridProps) {
  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div
      className={`w-full mx-auto mb-4 ${
        selectedIds.length >= 4 ? "max-w-6xl" : "max-w-4xl"
      }`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {selectedIds.map((id) => {
            const widgetInfo = widgetData.get(id);
            if (!widgetInfo) return null;

            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Widget
                  type={widgetInfo.type}
                  data={widgetInfo.data}
                  onClick={onWidgetClick ? () => onWidgetClick(id) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
