"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Activity, Chart, Dependency, Profile } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { GanttHeader } from "./gantt-header";
import { GanttGrid } from "./gantt-grid";
import { GanttBar } from "./gantt-bar";
import { GanttDependencyLines } from "./gantt-dependency-lines";
import { ActivitySidebar } from "./activity-sidebar";
import { TimelineControls } from "./timeline-controls";
import { ActivityForm } from "./activity-form";
import { ShareDialog } from "./share-dialog";
import { ProjectComments } from "./project-comments";
import { MessageSquare } from "lucide-react";
import { getTimelineRange, getColumns, getColumnWidth } from "@/lib/utils/dates";
import { buildDisplayRows } from "@/lib/utils/display-rows";
import { Toaster } from "sonner";

const ROW_HEIGHT = 44;

export function GanttChart({
  chart,
  initialActivities,
  initialDependencies,
  canEdit,
  isOwner,
  members,
  currentUserId,
}: {
  chart: Chart;
  initialActivities: Activity[];
  initialDependencies: Dependency[];
  canEdit: boolean;
  isOwner: boolean;
  members: Profile[];
  currentUserId: string;
}) {
  const {
    activities,
    dependencies,
    viewMode,
    columnWidth,
    selectedActivityId,
    collapsedGroupIds,
    setActivities,
    setDependencies,
    setCanEdit,
    setColumnWidth,
  } = useGanttStore();

  const [showComments, setShowComments] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    setActivities(initialActivities);
    setDependencies(initialDependencies);
    setCanEdit(canEdit);
  }, [initialActivities, initialDependencies, canEdit, setActivities, setDependencies, setCanEdit]);

  // Reset column width when view mode changes
  useEffect(() => {
    setColumnWidth(getColumnWidth(viewMode));
  }, [viewMode, setColumnWidth]);

  // Pinch-to-zoom on the timeline area
  const pinchRef = useRef<{ startDist: number; startWidth: number } | null>(null);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const getTouchDist = (e: TouchEvent) => {
      const [a, b] = [e.touches[0], e.touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          startDist: getTouchDist(e),
          startWidth: useGanttStore.getState().columnWidth,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dist = getTouchDist(e);
        const scale = dist / pinchRef.current.startDist;
        setColumnWidth(Math.round(pinchRef.current.startWidth * scale));
      }
    };

    const handleTouchEnd = () => {
      pinchRef.current = null;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [setColumnWidth]);

  // Sync vertical scroll between sidebar and timeline
  const handleTimelineScroll = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (timelineRef.current && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = timelineRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  const handleSidebarScroll = useCallback(() => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (timelineRef.current && sidebarScrollRef.current) {
      timelineRef.current.scrollTop = sidebarScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, []);

  const displayRows = buildDisplayRows(activities, collapsedGroupIds);

  // Use ALL activities for timeline range (not just visible rows)
  const { start: timelineStart, end: timelineEnd } =
    getTimelineRange(activities);
  const columns = getColumns(timelineStart, timelineEnd, viewMode);
  const totalWidth = columns.length * columnWidth;
  const totalHeight = displayRows.length * ROW_HEIGHT;

  const selectedActivity = selectedActivityId
    ? activities.find((a) => a.id === selectedActivityId)
    : null;

  // Sidebar width for print layout
  const sidebarWidth = 240;
  const printTotalWidth = sidebarWidth + totalWidth;

  return (
    <div className="flex flex-col h-full">
      <Toaster position="bottom-right" />
      <TimelineControls chart={chart} isOwner={isOwner} canEdit={canEdit}>
        <button
          onClick={() => setShowComments((prev) => !prev)}
          className={`flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-sm font-medium rounded-lg transition-colors ${
            showComments
              ? "bg-[var(--brand-navy)] text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Toggle discussion"
        >
          <MessageSquare size={16} />
          <span className="hidden sm:inline">Discuss</span>
        </button>
      </TimelineControls>

      {/* Print-only title */}
      <div className="hidden print-title px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">{chart.title}</h1>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden print-chart-area" style={{ ["--print-total-width" as string]: `${printTotalWidth}px` }}>
        <ActivitySidebar
          displayRows={displayRows}
          chartId={chart.id}
          members={members}
          rowHeight={ROW_HEIGHT}
          scrollRef={sidebarScrollRef}
          onScroll={handleSidebarScroll}
        />

        <div
          ref={timelineRef}
          className="flex-1 min-h-0 overflow-auto relative"
          onScroll={handleTimelineScroll}
        >
          <div style={{ width: totalWidth }}>
            <GanttHeader
              columns={columns}
              columnWidth={columnWidth}
              viewMode={viewMode}
            />
            <div className="relative" style={{ height: totalHeight }}>
              <GanttGrid
                columns={columns}
                columnWidth={columnWidth}
                height={totalHeight}
              />
              {displayRows.map((row, index) => (
                <GanttBar
                  key={row.activity.id}
                  displayRow={row}
                  index={index}
                  timelineStart={timelineStart}
                  columnWidth={columnWidth}
                  rowHeight={ROW_HEIGHT}
                  chartId={chart.id}
                />
              ))}
              <GanttDependencyLines
                displayRows={displayRows}
                dependencies={dependencies}
                timelineStart={timelineStart}
                columnWidth={columnWidth}
                rowHeight={ROW_HEIGHT}
              />
            </div>
          </div>
        </div>
      </div>

      {showComments && (
        <ProjectComments
          chartId={chart.id}
          currentUserId={currentUserId}
          onClose={() => setShowComments(false)}
        />
      )}

      {selectedActivity && canEdit && (
        <ActivityForm
          activity={selectedActivity}
          members={members}
          chartId={chart.id}
        />
      )}

      <ShareDialog chartId={chart.id} isOwner={isOwner} />
    </div>
  );
}
