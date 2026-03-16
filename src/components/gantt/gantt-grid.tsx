"use client";

import { ColumnInfo } from "@/lib/utils/dates";

export function GanttGrid({
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
            col.isToday ? "border-blue-300 bg-blue-50/30" : "border-gray-100"
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
