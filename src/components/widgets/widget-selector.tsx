"use client";

import { Button } from "@/components/ui/button";
import {
  card,
  badge,
  dialog as dialogTokens,
  text,
} from "@/components/ui/design-tokens";
import { HOMEIO_DIALOG_CLOSE_BUTTON_CLASS } from "@/components/ui/dialog-chrome";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Pencil, X } from "lucide-react";
import { getWidgetSections, MAX_WIDGETS } from "./constants";
import type {
  AvailableWidget,
  CustomWidgetData,
  WidgetData,
  WidgetType,
} from "./types";
import { WidgetSection } from "./widget-section";
import { Widget } from "./widgets";

interface WidgetSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  toggleWidget: (id: string) => void;
  updateCustomWidget: (id: string, data: Partial<CustomWidgetData>) => void;
  isSelected: (id: string) => boolean;
  shakeTrigger: number;
}

export function WidgetSelector({
  open,
  onOpenChange,
  selectedIds,
  widgetData,
  toggleWidget,
  updateCustomWidget,
  isSelected,
  shakeTrigger,
}: WidgetSelectorProps) {
  const sections = getWidgetSections();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          dialogTokens.content,
          "max-w-[900px] sm:max-w-[1000px] max-h-[85vh] overflow-hidden flex flex-col",
        )}
      >
        <DialogHeader className={cn(dialogTokens.header, "px-8 py-5")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={badge.base}>Widgets</span>
              <div className="flex items-center gap-3">
                <div>
                  <DialogTitle className="text-3xl font-semibold">
                    Edit widgets
                  </DialogTitle>
                  <p className={cn(text.muted, "text-sm")}>
                    Select up to {MAX_WIDGETS} widgets ({selectedIds.length}/
                    {MAX_WIDGETS})
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className={cn(HOMEIO_DIALOG_CLOSE_BUTTON_CLASS, "h-10 w-10")}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview area */}
        <div className="px-6 py-3 border-b border-border">
          <p className={cn(text.label, "uppercase tracking-wider mb-2")}>
            Preview
          </p>
          <motion.div
            key={shakeTrigger}
            initial={shakeTrigger > 0 ? { x: 0 } : false}
            animate={shakeTrigger > 0 ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          >
            {Array.from({ length: MAX_WIDGETS }, (_, slot) => slot).map(
              (slot) => {
                const widgetId = selectedIds[slot];
                const widgetInfo = widgetId ? widgetData.get(widgetId) : null;

                return (
                  <div
                    key={slot}
                    className={cn(
                      "rounded-xl overflow-hidden h-[160px]",
                      !widgetInfo && "border-2 border-dashed border-border/60",
                    )}
                  >
                    {widgetInfo ? (
                      <div className="h-full">
                        <Widget type={widgetInfo.type} data={widgetInfo.data} />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <span className={text.muted}>Empty</span>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </motion.div>
        </div>

        {/* Widget selection area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-4">
          {sections.map((section) => (
            <div key={section.appId}>
              <WidgetSection
                appName={section.appName}
                appIcon={section.appIcon}
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {section.widgets.map((widget) => (
                  <WidgetPreviewCard
                    key={widget.id}
                    widget={widget}
                    widgetData={widgetData}
                    isSelected={isSelected(widget.id)}
                    onToggle={() => toggleWidget(widget.id)}
                    updateCustomWidget={updateCustomWidget}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WidgetPreviewCardProps {
  widget: AvailableWidget;
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;
  isSelected: boolean;
  onToggle: () => void;
  updateCustomWidget: (id: string, data: Partial<CustomWidgetData>) => void;
}

function WidgetPreviewCard({
  widget,
  widgetData,
  isSelected,
  onToggle,
  updateCustomWidget,
}: WidgetPreviewCardProps) {
  const info = widgetData.get(widget.id);
  const customData =
    widget.type === "custom" && info?.type === "custom"
      ? (info.data as CustomWidgetData)
      : null;

  const handleEditCustomWidget = () => {
    if (!customData) return;

    const title = window.prompt("Custom widget title", customData.title);
    if (title === null) return;

    const body = window.prompt("Custom widget text", customData.body);
    if (body === null) return;

    updateCustomWidget(widget.id, {
      ...customData,
      title,
      body,
    });
  };

  return (
    <div
      className={cn(
        card.base,
        "relative cursor-pointer transition-all h-full flex flex-col items-stretch p-1.5 gap-0.5",
        isSelected && card.selected,
        !isSelected && card.hover,
      )}
      onClick={onToggle}
    >
      {customData ? (
        <button
          type="button"
          className="absolute right-2 top-2 z-20 rounded-md border border-border bg-secondary/60 p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            handleEditCustomWidget();
          }}
          aria-label="Edit custom widget"
          title="Edit custom widget"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {/* Mini widget preview - scaled down */}
      <div className="aspect-[3/2] overflow-hidden rounded-lg">
        {info ? (
          <div
            className="h-full w-full origin-top-left scale-[0.5]"
            style={{ width: "200%", height: "200%" }}
          >
            <Widget type={info.type} data={info.data} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-secondary/40 rounded-lg">
            <span className={cn(text.muted, "text-[10px]")}>No data</span>
          </div>
        )}
      </div>

      {/* Widget name */}
      <div className="px-1 pb-1">
        <p className={cn(text.valueSmall, "truncate text-xs leading-tight")}>
          {widget.name}
        </p>
      </div>
    </div>
  );
}
