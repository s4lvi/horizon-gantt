"use client";

import { useCallback, useRef } from "react";
import { Activity } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { dateToPixel, pixelToDate, columnIndexToDate } from "@/lib/utils/dates";
import { updateActivity } from "@/lib/actions/activity-actions";
import { cascadeDependencies } from "@/lib/utils/dependency-engine";
import { bulkUpdateActivities } from "@/lib/actions/activity-actions";
import { parseISO, differenceInDays, addDays, format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

export function GanttBar({
  activity,
  index,
  timelineStart,
  columnWidth,
  rowHeight,
  chartId,
}: {
  activity: Activity;
  index: number;
  timelineStart: Date;
  columnWidth: number;
  rowHeight: number;
  chartId: string;
}) {
  const {
    viewMode,
    canEdit,
    dragState,
    linkState,
    activities,
    dependencies,
    setDragState,
    setLinkState,
    updateActivity: updateActivityStore,
    setActivities,
    setSelectedActivityId,
    selectedActivityId,
  } = useGanttStore();

  const barRef = useRef<HTMLDivElement>(null);

  const top = index * rowHeight + 6;
  const barHeight = rowHeight - 12;

  if (!activity.start_date || !activity.end_date) {
    // No dates - show a clickable placeholder row
    return (
      <div
        className="absolute cursor-pointer group"
        style={{ top, left: 0, right: 0, height: barHeight }}
        onClick={(e) => {
          if (!canEdit) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const date = pixelToDate(x, timelineStart, viewMode, columnWidth);
          const endDate = addDays(date, viewMode === "months-weeks" ? 7 : 3);
          const startStr = format(date, "yyyy-MM-dd");
          const endStr = format(endDate, "yyyy-MM-dd");
          updateActivityStore(activity.id, {
            start_date: startStr,
            end_date: endStr,
          });
          updateActivity(activity.id, {
            start_date: startStr,
            end_date: endStr,
          }).catch(() => toast.error("Failed to set dates"));
        }}
      >
        <div className="h-full w-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-gray-400">
          Click to set start date
        </div>
      </div>
    );
  }

  const startDate = parseISO(activity.start_date);
  const endDate = parseISO(activity.end_date);
  const left = dateToPixel(startDate, timelineStart, viewMode, columnWidth);
  const right = dateToPixel(
    addDays(endDate, 1),
    timelineStart,
    viewMode,
    columnWidth
  );
  const width = Math.max(right - left, columnWidth);

  const handleMouseDown = (
    e: React.MouseEvent,
    type: "move" | "resize-start" | "resize-end"
  ) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();

    if (linkState) {
      // We're in link mode, clicking a bar completes the link
      return;
    }

    setDragState({
      activityId: activity.id,
      type,
      startX: e.clientX,
      originalStart: activity.start_date!,
      originalEnd: activity.end_date!,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - e.clientX;
      const dayDelta = Math.round(dx / columnWidth);
      if (dayDelta === 0) return;

      const origStart = parseISO(activity.start_date!);
      const origEnd = parseISO(activity.end_date!);
      const unitMultiplier = viewMode === "months-weeks" ? 7 : 1;
      const adjustedDelta = dayDelta * unitMultiplier;

      let newStart: Date, newEnd: Date;

      if (type === "move") {
        newStart = addDays(origStart, adjustedDelta);
        newEnd = addDays(origEnd, adjustedDelta);
      } else if (type === "resize-start") {
        newStart = addDays(origStart, adjustedDelta);
        newEnd = origEnd;
        if (newStart >= newEnd) return;
      } else {
        newStart = origStart;
        newEnd = addDays(origEnd, adjustedDelta);
        if (newEnd <= newStart) return;
      }

      updateActivityStore(activity.id, {
        start_date: format(newStart, "yyyy-MM-dd"),
        end_date: format(newEnd, "yyyy-MM-dd"),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setDragState(null);

      // Get the updated activity from the store
      const store = useGanttStore.getState();
      const updated = store.activities.find((a) => a.id === activity.id);
      if (!updated) return;

      // Cascade dependencies
      const cascaded = cascadeDependencies(
        store.activities,
        store.dependencies,
        activity.id
      );
      setActivities(cascaded);

      // Persist changes
      const changed = cascaded.filter((a) => {
        const orig = activities.find((o) => o.id === a.id);
        return (
          orig &&
          (orig.start_date !== a.start_date || orig.end_date !== a.end_date)
        );
      });

      if (changed.length > 0) {
        bulkUpdateActivities(
          changed.map((a) => ({
            id: a.id,
            start_date: a.start_date!,
            end_date: a.end_date!,
          }))
        ).catch(() => toast.error("Failed to save changes"));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const isSelected = selectedActivityId === activity.id;

  return (
    <div
      ref={barRef}
      className={cn(
        "absolute rounded-md cursor-grab active:cursor-grabbing group select-none flex items-center",
        isSelected && "ring-2 ring-blue-500 ring-offset-1"
      )}
      style={{
        top,
        left,
        width,
        height: barHeight,
        backgroundColor: activity.color,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (linkState) {
          // Complete linking
          const fromId = linkState.fromActivityId;
          if (fromId !== activity.id) {
            window.dispatchEvent(
              new CustomEvent("complete-link", {
                detail: { fromId, toId: activity.id },
              })
            );
          }
          setLinkState(null);
          return;
        }
        setSelectedActivityId(isSelected ? null : activity.id);
      }}
      onMouseDown={(e) => {
        const rect = barRef.current?.getBoundingClientRect();
        if (!rect) return;
        const relX = e.clientX - rect.left;
        const edgeSize = 8;

        if (relX <= edgeSize) {
          handleMouseDown(e, "resize-start");
        } else if (relX >= rect.width - edgeSize) {
          handleMouseDown(e, "resize-end");
        } else {
          handleMouseDown(e, "move");
        }
      }}
    >
      {/* Resize handles */}
      <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/10 rounded-l-md" />
      <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/10 rounded-r-md" />

      {/* Bar content */}
      <span className="text-xs text-white font-medium px-2 truncate drop-shadow-sm">
        {activity.title}
      </span>

      {/* Link button */}
      {canEdit && (
        <button
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm z-10"
          onClick={(e) => {
            e.stopPropagation();
            setLinkState({ fromActivityId: activity.id });
            toast.info("Click another activity to create a dependency");
          }}
        >
          <Link2 size={12} className="text-gray-600" />
        </button>
      )}
    </div>
  );
}
