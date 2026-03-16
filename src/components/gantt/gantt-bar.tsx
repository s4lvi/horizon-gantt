"use client";

import { useRef } from "react";
import { DisplayRow } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { dateToPixel, pixelToDate } from "@/lib/utils/dates";
import { updateActivity } from "@/lib/actions/activity-actions";
import { cascadeDependencies } from "@/lib/utils/dependency-engine";
import { bulkUpdateActivities } from "@/lib/actions/activity-actions";
import { parseISO, addDays, format } from "date-fns";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

export function GanttBar({
  displayRow,
  index,
  timelineStart,
  columnWidth,
  rowHeight,
  chartId,
}: {
  displayRow: DisplayRow;
  index: number;
  timelineStart: Date;
  columnWidth: number;
  rowHeight: number;
  chartId: string;
}) {
  const activity = displayRow.activity;
  const {
    viewMode,
    canEdit,
    linkState,
    activities,
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

  // Determine which dates to use
  const effectiveStartDate =
    displayRow.isGroup && displayRow.isCollapsed
      ? displayRow.groupStartDate
      : activity.start_date;
  const effectiveEndDate =
    displayRow.isGroup && displayRow.isCollapsed
      ? displayRow.groupEndDate
      : activity.end_date;

  // Expanded group with no own dates: render a thin translucent bar from children range
  if (displayRow.isGroup && !displayRow.isCollapsed) {
    if (!displayRow.groupStartDate || !displayRow.groupEndDate) {
      return (
        <div
          className="absolute"
          style={{ top, left: 0, right: 0, height: barHeight }}
        />
      );
    }
    const startDate = parseISO(displayRow.groupStartDate);
    const endDate = parseISO(displayRow.groupEndDate);
    const left = dateToPixel(startDate, timelineStart, viewMode, columnWidth);
    const right = dateToPixel(
      addDays(endDate, 1),
      timelineStart,
      viewMode,
      columnWidth
    );
    const width = Math.max(right - left, columnWidth);
    return (
      <div
        className="absolute rounded-sm"
        style={{
          top: top + barHeight / 2 - 3,
          left,
          width,
          height: 6,
          backgroundColor: activity.color,
          opacity: 0.25,
        }}
      />
    );
  }

  // No dates set — clickable placeholder
  if (!effectiveStartDate || !effectiveEndDate) {
    if (displayRow.isGroup) {
      return (
        <div
          className="absolute"
          style={{ top, left: 0, right: 0, height: barHeight }}
        />
      );
    }
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

  const startDate = parseISO(effectiveStartDate);
  const endDate = parseISO(effectiveEndDate);
  const left = dateToPixel(startDate, timelineStart, viewMode, columnWidth);
  const right = dateToPixel(
    addDays(endDate, 1),
    timelineStart,
    viewMode,
    columnWidth
  );
  const width = Math.max(right - left, columnWidth);

  // Collapsed group bar — not draggable
  const isCollapsedGroup = displayRow.isGroup && displayRow.isCollapsed;

  const handleMouseDown = (
    e: React.MouseEvent,
    type: "move" | "resize-start" | "resize-end"
  ) => {
    if (!canEdit || isCollapsedGroup) return;
    e.preventDefault();
    e.stopPropagation();

    if (linkState) return;

    const scrollContainer = barRef.current?.closest(".overflow-auto");
    const initialScrollLeft = scrollContainer?.scrollLeft ?? 0;

    setDragState({
      activityId: activity.id,
      type,
      startX: e.clientX,
      originalStart: activity.start_date!,
      originalEnd: activity.end_date!,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentScrollLeft = scrollContainer?.scrollLeft ?? 0;
      const scrollDelta = currentScrollLeft - initialScrollLeft;
      const dx = moveEvent.clientX - e.clientX + scrollDelta;
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

      const store = useGanttStore.getState();
      const cascaded = cascadeDependencies(
        store.activities,
        store.dependencies,
        activity.id
      );
      setActivities(cascaded);

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
        "absolute rounded-md select-none flex items-center group",
        isCollapsedGroup
          ? "cursor-default"
          : "cursor-grab active:cursor-grabbing",
        isSelected && "ring-2 ring-blue-500 ring-offset-1"
      )}
      style={{
        top,
        left,
        width,
        height: barHeight,
        backgroundColor: activity.color,
        ...(isCollapsedGroup && {
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 4px,
            rgba(255,255,255,0.15) 4px,
            rgba(255,255,255,0.15) 8px
          )`,
        }),
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (linkState) {
          const successorId = linkState.fromActivityId;
          if (successorId !== activity.id) {
            window.dispatchEvent(
              new CustomEvent("complete-link", {
                detail: { fromId: activity.id, toId: successorId },
              })
            );
          }
          setLinkState(null);
          return;
        }
        setSelectedActivityId(isSelected ? null : activity.id);
      }}
      onMouseDown={(e) => {
        if (isCollapsedGroup) return;
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
      {/* Resize handles (not for collapsed groups) */}
      {!isCollapsedGroup && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/10 rounded-l-md" />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-black/10 rounded-r-md" />
        </>
      )}

      {/* Bar content */}
      <span className="text-xs text-white font-medium px-2 truncate drop-shadow-sm">
        {activity.title}
      </span>

      {/* Link button — not for groups */}
      {canEdit && !displayRow.isGroup && (
        <button
          className="absolute -right-7 top-1/2 -translate-y-1/2 w-5 h-5 bg-white border border-gray-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm z-10"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setLinkState({ fromActivityId: activity.id });
            toast.info("Click the activity this depends on");
          }}
        >
          <Link2 size={10} className="text-gray-600" />
        </button>
      )}
    </div>
  );
}
