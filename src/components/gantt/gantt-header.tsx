"use client";

import { cn } from "@/lib/utils/cn";
import { ColumnInfo, getHeaderGroups } from "@/lib/utils/dates";
import { ViewMode } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { format, isWeekend } from "date-fns";
import { useCallback } from "react";

export function GanttHeader({
  columns,
  columnWidth,
  viewMode,
}: {
  columns: ColumnInfo[];
  columnWidth: number;
  viewMode: ViewMode;
}) {
  const { setColumnWidth } = useGanttStore();
  const groups = getHeaderGroups(columns, viewMode);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = columnWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        // Scale the delta by how many columns are in a group (so small drags have visible effect)
        const avgGroupSpan =
          groups.length > 0
            ? groups.reduce((sum, g) => sum + g.span, 0) / groups.length
            : 1;
        const newWidth = startWidth + dx / avgGroupSpan;
        setColumnWidth(Math.round(newWidth));
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
      };

      document.body.style.cursor = "col-resize";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidth, groups, setColumnWidth]
  );

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      {/* Top row: month/week groups */}
      <div className="flex border-b border-gray-100">
        {groups.map((group, i) => (
          <div
            key={i}
            className="text-xs font-semibold text-gray-600 px-2 py-1 border-r border-gray-100 text-center truncate relative select-none"
            style={{ width: group.span * columnWidth }}
          >
            {group.label}
            {/* Resize handle on the right edge */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-gray-300/40 z-10"
              style={{ marginRight: -4 }}
              onMouseDown={handleResizeStart}
            />
          </div>
        ))}
      </div>
      {/* Bottom row: individual columns */}
      <div className="flex">
        {columns.map((col, i) => {
          const showDow = viewMode !== "months-weeks";
          const weekend = showDow && isWeekend(col.date);
          return (
            <div
              key={i}
              className={cn(
                "text-center py-1 border-r border-gray-100 flex-shrink-0 leading-tight",
                col.isToday
                  ? "bg-[#e8eef5] text-[var(--brand-navy)] font-bold"
                  : weekend
                    ? "text-gray-400"
                    : "text-gray-500"
              )}
              style={{ width: columnWidth }}
            >
              {showDow && (
                <div className="text-[9px] uppercase tracking-wide">
                  {format(col.date, "EEE").charAt(0)}
                </div>
              )}
              <div className="text-xs">{col.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
