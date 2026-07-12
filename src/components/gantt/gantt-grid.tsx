"use client";

import { memo } from "react";
import { ColumnInfo } from "@/lib/utils/dates";

function GanttGridInner({
  columns,
  columnWidth,
  height,
}: {
  columns: ColumnInfo[];
  columnWidth: number;
  height: number;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {columns.map((col, i) => (
        <div
          key={i}
          className={`absolute top-0 border-r ${
            col.isToday ? "border-blue-300 bg-[#e8eef5]/30" : "border-gray-100"
          }`}
          style={{
            left: i * columnWidth,
            width: columnWidth,
            height,
          }}
        />
      ))}
    </div>
  );
}

// The columns array is rebuilt every parent render; compare its extent
// instead so the grid skips re-rendering during drags.
export const GanttGrid = memo(GanttGridInner, (prev, next) => {
  return (
    prev.columns.length === next.columns.length &&
    prev.columns[0]?.date.getTime() === next.columns[0]?.date.getTime() &&
    prev.columnWidth === next.columnWidth &&
    prev.height === next.height
  );
});
