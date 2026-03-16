"use client";

import { useEffect } from "react";
import { DisplayRow, Dependency } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { dateToPixel } from "@/lib/utils/dates";
import { parseISO, addDays } from "date-fns";
import { addDependency as addDependencyAction } from "@/lib/actions/dependency-actions";
import { removeDependency as removeDependencyAction } from "@/lib/actions/dependency-actions";
import { hasCycle } from "@/lib/utils/dependency-engine";
import { toast } from "sonner";

export function GanttDependencyLines({
  displayRows,
  dependencies,
  timelineStart,
  columnWidth,
  rowHeight,
}: {
  displayRows: DisplayRow[];
  dependencies: Dependency[];
  timelineStart: Date;
  columnWidth: number;
  rowHeight: number;
}) {
  const { viewMode, activities, addDependency, removeDependency } =
    useGanttStore();

  useEffect(() => {
    const handler = async (e: Event) => {
      const { fromId, toId } = (e as CustomEvent).detail;

      if (hasCycle(dependencies, fromId, toId)) {
        toast.error("Cannot create dependency: would create a cycle");
        return;
      }

      try {
        const chartId = activities[0]?.chart_id;
        if (!chartId) return;
        const dep = await addDependencyAction(chartId, fromId, toId);
        addDependency(dep);
        toast.success("Dependency created");
      } catch {
        toast.error("Failed to create dependency");
      }
    };

    window.addEventListener("complete-link", handler);
    return () => window.removeEventListener("complete-link", handler);
  }, [dependencies, activities, addDependency]);

  // Build a set of visible activity IDs from display rows
  const visibleIds = new Set(displayRows.map((r) => r.activity.id));

  const getBarPosition = (activityId: string) => {
    const rowIndex = displayRows.findIndex(
      (r) => r.activity.id === activityId
    );
    if (rowIndex === -1) return null;

    const row = displayRows[rowIndex];
    const startDateStr =
      row.isGroup && row.isCollapsed
        ? row.groupStartDate
        : row.activity.start_date;
    const endDateStr =
      row.isGroup && row.isCollapsed
        ? row.groupEndDate
        : row.activity.end_date;

    if (!startDateStr || !endDateStr) return null;

    const start = dateToPixel(
      parseISO(startDateStr),
      timelineStart,
      viewMode,
      columnWidth
    );
    const end = dateToPixel(
      addDays(parseISO(endDateStr), 1),
      timelineStart,
      viewMode,
      columnWidth
    );
    const y = rowIndex * rowHeight + rowHeight / 2;
    return { startX: start, endX: end, y };
  };

  const handleRemoveDep = async (depId: string) => {
    removeDependency(depId);
    try {
      await removeDependencyAction(depId);
    } catch {
      toast.error("Failed to remove dependency");
    }
  };

  return (
    <svg className="absolute inset-0 pointer-events-none overflow-visible">
      {dependencies.map((dep) => {
        // Skip dependencies where either end is not visible
        if (
          !visibleIds.has(dep.predecessor_id) ||
          !visibleIds.has(dep.successor_id)
        )
          return null;

        const predPos = getBarPosition(dep.predecessor_id);
        const succPos = getBarPosition(dep.successor_id);
        if (!predPos || !succPos) return null;

        const startX = predPos.endX;
        const startY = predPos.y;
        const endX = succPos.startX;
        const endY = succPos.y;

        const midX = startX + 12;

        const path = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;

        return (
          <g key={dep.id}>
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="pointer-events-auto cursor-pointer"
              onClick={() => {
                if (confirm("Remove this dependency?")) {
                  handleRemoveDep(dep.id);
                }
              }}
            />
            <path
              d={path}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <polygon
              points={`${endX},${endY} ${endX - 6},${endY - 4} ${endX - 6},${endY + 4}`}
              fill="#94a3b8"
            />
          </g>
        );
      })}
    </svg>
  );
}
