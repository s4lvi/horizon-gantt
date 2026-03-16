"use client";

import { useEffect } from "react";
import { Activity, Dependency } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { dateToPixel } from "@/lib/utils/dates";
import { parseISO, addDays } from "date-fns";
import { addDependency as addDependencyAction } from "@/lib/actions/dependency-actions";
import { removeDependency as removeDependencyAction } from "@/lib/actions/dependency-actions";
import { hasCycle } from "@/lib/utils/dependency-engine";
import { toast } from "sonner";

export function GanttDependencyLines({
  activities,
  dependencies,
  timelineStart,
  columnWidth,
  rowHeight,
}: {
  activities: Activity[];
  dependencies: Dependency[];
  timelineStart: Date;
  columnWidth: number;
  rowHeight: number;
}) {
  const { viewMode, addDependency, removeDependency } = useGanttStore();

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

  const getBarPosition = (activity: Activity) => {
    if (!activity.start_date || !activity.end_date) return null;
    const start = dateToPixel(
      parseISO(activity.start_date),
      timelineStart,
      viewMode,
      columnWidth
    );
    const end = dateToPixel(
      addDays(parseISO(activity.end_date), 1),
      timelineStart,
      viewMode,
      columnWidth
    );
    const index = activities.findIndex((a) => a.id === activity.id);
    const y = index * rowHeight + rowHeight / 2;
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
        const predecessor = activities.find(
          (a) => a.id === dep.predecessor_id
        );
        const successor = activities.find((a) => a.id === dep.successor_id);
        if (!predecessor || !successor) return null;

        const predPos = getBarPosition(predecessor);
        const succPos = getBarPosition(successor);
        if (!predPos || !succPos) return null;

        const startX = predPos.endX;
        const startY = predPos.y;
        const endX = succPos.startX;
        const endY = succPos.y;

        const midX = startX + 12;

        const path = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;

        return (
          <g key={dep.id}>
            {/* Clickable invisible wide path for deletion */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={12}
              className="pointer-events-auto cursor-pointer"
              onClick={() => {
                if (
                  confirm("Remove this dependency?")
                ) {
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
            {/* Arrowhead */}
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
