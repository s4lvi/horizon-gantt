"use client";

import { cn } from "@/lib/utils/cn";
import { ColumnInfo, getHeaderGroups } from "@/lib/utils/dates";
import { ViewMode } from "@/lib/types";

export function GanttHeader({
  columns,
  columnWidth,
  viewMode,
}: {
  columns: ColumnInfo[];
  columnWidth: number;
  viewMode: ViewMode;
}) {
  const groups = getHeaderGroups(columns, viewMode);

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      {/* Top row: month/week groups */}
      <div className="flex border-b border-gray-100">
        {groups.map((group, i) => (
          <div
            key={i}
            className="text-xs font-semibold text-gray-600 px-2 py-1 border-r border-gray-100 text-center truncate"
            style={{ width: group.span * columnWidth }}
          >
            {group.label}
          </div>
        ))}
      </div>
      {/* Bottom row: individual columns */}
      <div className="flex">
        {columns.map((col, i) => (
          <div
            key={i}
            className={cn(
              "text-xs text-center py-1 border-r border-gray-100 flex-shrink-0",
              col.isToday
                ? "bg-blue-50 text-blue-700 font-bold"
                : "text-gray-500"
            )}
            style={{ width: columnWidth }}
          >
            {col.label}
          </div>
        ))}
      </div>
    </div>
  );
}
