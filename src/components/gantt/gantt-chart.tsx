"use client";

import { useEffect, useRef } from "react";
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
    selectedActivityId,
    collapsedGroupIds,
    setActivities,
    setDependencies,
    setCanEdit,
  } = useGanttStore();

  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActivities(initialActivities);
    setDependencies(initialDependencies);
    setCanEdit(canEdit);
  }, [initialActivities, initialDependencies, canEdit, setActivities, setDependencies, setCanEdit]);

  const displayRows = buildDisplayRows(activities, collapsedGroupIds);

  // Use ALL activities for timeline range (not just visible rows)
  const { start: timelineStart, end: timelineEnd } =
    getTimelineRange(activities);
  const columns = getColumns(timelineStart, timelineEnd, viewMode);
  const columnWidth = getColumnWidth(viewMode);
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
      <TimelineControls chart={chart} isOwner={isOwner} canEdit={canEdit} />

      {/* Print-only title */}
      <div className="hidden print-title px-4 py-3 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">{chart.title}</h1>
      </div>

      <div className="flex flex-1 overflow-hidden print-chart-area" style={{ ["--print-total-width" as string]: `${printTotalWidth}px` }}>
        <ActivitySidebar
          displayRows={displayRows}
          chartId={chart.id}
          members={members}
          rowHeight={ROW_HEIGHT}
        />

        <div ref={timelineRef} className="flex-1 overflow-auto relative">
          <div style={{ width: totalWidth, minHeight: "100%" }}>
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
