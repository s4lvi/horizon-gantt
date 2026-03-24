"use client";

import { Activity, Dependency, DisplayRow } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { getOccupiedRange, getColumns, getHeaderGroups, dateToPixel } from "@/lib/utils/dates";
import { parseISO, addDays, format, isWeekend } from "date-fns";
import { buildDisplayRows } from "@/lib/utils/display-rows";

const PRINT_ROW_HEIGHT = 22;
const PRINT_COL_WIDTH = 18;
const SIDEBAR_WIDTH = 140;

export function PrintView({ title }: { title: string }) {
  const { activities, dependencies, viewMode, collapsedGroupIds } =
    useGanttStore();

  if (activities.length === 0) return null;

  const displayRows = buildDisplayRows(activities, collapsedGroupIds);
  const range = getOccupiedRange(activities);
  const columns = getColumns(range.start, range.end, viewMode);
  const groups = getHeaderGroups(columns, viewMode);

  const timelineWidth = columns.length * PRINT_COL_WIDTH;
  const totalWidth = SIDEBAR_WIDTH + timelineWidth;
  const totalHeight = displayRows.length * PRINT_ROW_HEIGHT;

  return (
    <div className="print-only-view" style={{ width: totalWidth }}>
      {/* Title */}
      <div style={{ padding: "6px 8px", borderBottom: "1px solid #ccc", fontWeight: 700, fontSize: 13 }}>
        {title}
      </div>

      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <div style={{ width: SIDEBAR_WIDTH, flexShrink: 0, borderRight: "1px solid #ccc" }}>
          {/* Header spacer */}
          <div style={{ height: 30, borderBottom: "1px solid #ddd" }} />
          {/* Rows */}
          {displayRows.map((row) => (
            <div
              key={row.activity.id}
              style={{
                height: PRINT_ROW_HEIGHT,
                fontSize: 7,
                lineHeight: `${PRINT_ROW_HEIGHT}px`,
                paddingLeft: 4 + row.depth * 10,
                paddingRight: 4,
                borderBottom: "1px solid #f0f0f0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontWeight: row.isGroup ? 700 : 400,
                color: "#333",
              }}
            >
              {row.activity.title}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ width: timelineWidth, position: "relative" }}>
          {/* Header groups */}
          <div style={{ display: "flex", borderBottom: "1px solid #ddd", height: 15 }}>
            {groups.map((g, i) => (
              <div
                key={i}
                style={{
                  width: g.span * PRINT_COL_WIDTH,
                  fontSize: 6,
                  textAlign: "center",
                  borderRight: "1px solid #eee",
                  lineHeight: "15px",
                  color: "#666",
                  overflow: "hidden",
                }}
              >
                {g.label}
              </div>
            ))}
          </div>

          {/* Column headers */}
          <div style={{ display: "flex", borderBottom: "1px solid #ccc", height: 15 }}>
            {columns.map((col, i) => (
              <div
                key={i}
                style={{
                  width: PRINT_COL_WIDTH,
                  fontSize: 5,
                  textAlign: "center",
                  borderRight: "1px solid #f0f0f0",
                  lineHeight: "15px",
                  color: col.isToday ? "#1e3a5f" : isWeekend(col.date) ? "#bbb" : "#888",
                  fontWeight: col.isToday ? 700 : 400,
                  backgroundColor: col.isToday ? "#e8eef5" : undefined,
                }}
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* Grid + Bars */}
          <div style={{ position: "relative", height: totalHeight }}>
            {/* Grid lines */}
            {columns.map((col, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: i * PRINT_COL_WIDTH,
                  width: PRINT_COL_WIDTH,
                  height: totalHeight,
                  borderRight: "1px solid #f5f5f5",
                  backgroundColor: col.isToday ? "rgba(30,58,95,0.04)" : undefined,
                }}
              />
            ))}

            {/* Row lines */}
            {displayRows.map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * PRINT_ROW_HEIGHT,
                  left: 0,
                  right: 0,
                  height: PRINT_ROW_HEIGHT,
                  borderBottom: "1px solid #f5f5f5",
                }}
              />
            ))}

            {/* Activity bars */}
            {displayRows.map((row, index) => {
              const a = row.activity;
              let startStr = a.start_date;
              let endStr = a.end_date;

              if (row.isGroup && row.isCollapsed) {
                startStr = row.groupStartDate;
                endStr = row.groupEndDate;
              }
              if (row.isGroup && !row.isCollapsed) {
                startStr = row.groupStartDate;
                endStr = row.groupEndDate;
              }

              if (!startStr || !endStr) return null;

              const left = dateToPixel(parseISO(startStr), range.start, viewMode, PRINT_COL_WIDTH);
              const right = dateToPixel(addDays(parseISO(endStr), 1), range.start, viewMode, PRINT_COL_WIDTH);
              const width = Math.max(right - left, PRINT_COL_WIDTH);
              const top = index * PRINT_ROW_HEIGHT + 3;
              const barHeight = row.isGroup && !row.isCollapsed ? 4 : PRINT_ROW_HEIGHT - 6;
              const barTop = row.isGroup && !row.isCollapsed ? top + (PRINT_ROW_HEIGHT - 6) / 2 - 2 : top;

              return (
                <div
                  key={a.id}
                  style={{
                    position: "absolute",
                    left,
                    top: barTop,
                    width,
                    height: barHeight,
                    backgroundColor: a.color,
                    borderRadius: 2,
                    opacity: row.isGroup && !row.isCollapsed ? 0.3 : 1,
                    fontSize: 5,
                    color: "white",
                    lineHeight: `${barHeight}px`,
                    paddingLeft: 2,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {!row.isGroup || row.isCollapsed ? a.title : ""}
                </div>
              );
            })}

            {/* Dependency arrows */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: timelineWidth, height: totalHeight, pointerEvents: "none" }}>
              {dependencies.map((dep) => {
                const predIdx = displayRows.findIndex((r) => r.activity.id === dep.predecessor_id);
                const succIdx = displayRows.findIndex((r) => r.activity.id === dep.successor_id);
                if (predIdx === -1 || succIdx === -1) return null;

                const pred = displayRows[predIdx];
                const succ = displayRows[succIdx];
                const predEnd = pred.activity.end_date || (pred.isGroup ? pred.groupEndDate : null);
                const succStart = succ.activity.start_date || (succ.isGroup ? succ.groupStartDate : null);
                if (!predEnd || !succStart) return null;

                const x1 = dateToPixel(addDays(parseISO(predEnd), 1), range.start, viewMode, PRINT_COL_WIDTH);
                const y1 = predIdx * PRINT_ROW_HEIGHT + PRINT_ROW_HEIGHT / 2;
                const x2 = dateToPixel(parseISO(succStart), range.start, viewMode, PRINT_COL_WIDTH);
                const y2 = succIdx * PRINT_ROW_HEIGHT + PRINT_ROW_HEIGHT / 2;
                const mx = x1 + 6;

                return (
                  <g key={dep.id}>
                    <path d={`M${x1} ${y1} H${mx} V${y2} H${x2}`} fill="none" stroke="#94a3b8" strokeWidth={0.75} strokeDasharray="2 1" />
                    <polygon points={`${x2},${y2} ${x2 - 3},${y2 - 2} ${x2 - 3},${y2 + 2}`} fill="#94a3b8" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
