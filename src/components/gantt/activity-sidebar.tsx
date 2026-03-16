"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Activity, DisplayRow, Profile } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import {
  createActivity,
  deleteActivity,
  updateActivity,
  bulkUpdateActivities,
} from "@/lib/actions/activity-actions";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FolderClosed,
  ArrowUpFromLine,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

function SortableRow({
  row,
  rowHeight,
  chartId,
  isDropTarget,
}: {
  row: DisplayRow;
  rowHeight: number;
  chartId: string;
  isDropTarget: boolean;
}) {
  const {
    canEdit,
    selectedActivityId,
    setSelectedActivityId,
    updateActivity: updateActivityStore,
    removeActivity,
    toggleGroupCollapsed,
  } = useGanttStore();

  const activity = row.activity;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: rowHeight,
  };

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(activity.title);

  const isSelected = selectedActivityId === activity.id;

  const handleTitleSave = async () => {
    setEditing(false);
    if (title !== activity.title) {
      updateActivityStore(activity.id, { title });
      try {
        await updateActivity(activity.id, { title });
      } catch {
        toast.error("Failed to update title");
      }
    }
  };

  const handleDelete = async () => {
    removeActivity(activity.id);
    try {
      await deleteActivity(activity.id);
    } catch {
      toast.error("Failed to delete activity");
    }
  };

  const handleAddChild = async () => {
    try {
      const newActivity = await createActivity(chartId, activity.id, false);
      useGanttStore.getState().addActivity(newActivity);
      const store = useGanttStore.getState();
      if (store.collapsedGroupIds.has(activity.id)) {
        store.toggleGroupCollapsed(activity.id);
      }
    } catch {
      toast.error("Failed to add activity");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 border-b border-gray-100 group/row",
        isDragging && "opacity-50 bg-gray-50",
        isSelected && "bg-blue-50",
        row.isGroup && "bg-gray-50/50",
        isDropTarget && row.isGroup && "ring-2 ring-inset ring-blue-400 bg-blue-50"
      )}
    >
      <div
        className="flex items-center gap-1 flex-1 min-w-0"
        style={{ paddingLeft: 4 + row.depth * 20 }}
      >
        {canEdit && (
          <button
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        )}

        {row.isGroup ? (
          <button
            onClick={() => toggleGroupCollapsed(activity.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            {row.isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
        ) : (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: activity.color }}
          />
        )}

        {row.isGroup && (
          <span className="flex-shrink-0 text-gray-400">
            {row.isCollapsed ? (
              <FolderClosed size={14} />
            ) : (
              <FolderOpen size={14} />
            )}
          </span>
        )}

        {editing && canEdit ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setTitle(activity.title);
                setEditing(false);
              }
            }}
            autoFocus
            className="flex-1 text-sm bg-transparent outline-none border-b border-blue-400 min-w-0"
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-sm truncate cursor-pointer min-w-0",
              row.isGroup
                ? "font-semibold text-gray-800"
                : "text-gray-700"
            )}
            onClick={() => {
              if (canEdit) setEditing(true);
              setSelectedActivityId(isSelected ? null : activity.id);
            }}
          >
            {activity.title}
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 pr-1 flex-shrink-0">
        {canEdit && row.isGroup && (
          <button
            onClick={handleAddChild}
            className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-blue-500 transition-opacity"
            title="Add sub-activity"
          >
            <Plus size={14} />
          </button>
        )}

        {canEdit && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover/row:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function UngroupDropZone({ isOver }: { isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: "__ungroup__" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center gap-2 py-2 mx-2 my-1 rounded-lg border-2 border-dashed text-xs transition-colors",
        isOver
          ? "border-blue-400 bg-blue-50 text-blue-600"
          : "border-gray-200 text-gray-400"
      )}
    >
      <ArrowUpFromLine size={12} />
      Drop here to ungroup
    </div>
  );
}

export function ActivitySidebar({
  displayRows,
  chartId,
  members,
  rowHeight,
}: {
  displayRows: DisplayRow[];
  chartId: string;
  members: Profile[];
  rowHeight: number;
}) {
  const { canEdit, activities } = useGanttStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [overUngroup, setOverUngroup] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Show ungroup zone when dragging a child activity
  const draggedActivity = draggedId
    ? activities.find((a) => a.id === draggedId)
    : null;
  const showUngroupZone =
    draggedActivity && !draggedActivity.is_group && draggedActivity.parent_id !== null;

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverGroupId(null);
      setOverUngroup(false);
      return;
    }

    if (over.id === "__ungroup__") {
      setOverGroupId(null);
      setOverUngroup(true);
      return;
    }
    setOverUngroup(false);

    const dragged = activities.find((a) => a.id === active.id);
    if (dragged?.is_group) {
      setOverGroupId(null);
      return;
    }

    const overRow = displayRows.find((r) => r.activity.id === over.id);
    if (!overRow) {
      setOverGroupId(null);
      return;
    }

    if (overRow.isGroup && over.id !== active.id) {
      setOverGroupId(overRow.activity.id);
    } else if (overRow.activity.parent_id && over.id !== active.id) {
      setOverGroupId(overRow.activity.parent_id);
    } else {
      setOverGroupId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedId(null);
    setOverGroupId(null);
    setOverUngroup(false);

    if (!over || active.id === over.id) return;

    const dragged = activities.find((a) => a.id === active.id);
    if (!dragged) return;

    const store = useGanttStore.getState();

    // Handle ungroup drop zone
    if (over.id === "__ungroup__") {
      store.reorderWithinParent(dragged.id, null, null, "after");
      const updated = useGanttStore.getState().activities;
      try {
        await bulkUpdateActivities(
          updated.map((a) => ({
            id: a.id,
            sort_order: a.sort_order,
            ...(a.id === dragged.id ? { parent_id: null } : {}),
          }))
        );
      } catch {
        toast.error("Failed to save changes");
      }
      return;
    }

    const overRow = displayRows.find((r) => r.activity.id === over.id);
    if (!overRow) return;

    // Determine new parent
    let newParentId: string | null = null;
    let targetSiblingId: string | null = overRow.activity.id;
    let position: "before" | "after" = "after";

    if (dragged.is_group) {
      // Groups stay top-level, just reorder
      newParentId = null;
      // If dropped on another group, place after it
      if (overRow.isGroup) {
        targetSiblingId = overRow.activity.id;
        position = "after";
      } else {
        // Dropped on a non-group top-level item or child — find nearest top-level
        targetSiblingId = overRow.activity.parent_id || overRow.activity.id;
        position = "after";
      }
    } else if (overRow.isGroup) {
      // Dropped on a group -> become child at the end
      newParentId = overRow.activity.id;
      targetSiblingId = null; // append at end
      position = "after";
    } else if (overRow.activity.parent_id) {
      // Dropped on a child -> become sibling
      newParentId = overRow.activity.parent_id;
      targetSiblingId = overRow.activity.id;
      // Determine position based on drag direction
      const oldIdx = displayRows.findIndex((r) => r.activity.id === active.id);
      const newIdx = displayRows.findIndex((r) => r.activity.id === over.id);
      position = oldIdx < newIdx ? "after" : "before";
    } else {
      // Dropped on top-level non-group -> become top-level
      newParentId = null;
      targetSiblingId = overRow.activity.id;
      const oldIdx = displayRows.findIndex((r) => r.activity.id === active.id);
      const newIdx = displayRows.findIndex((r) => r.activity.id === over.id);
      position = oldIdx < newIdx ? "after" : "before";
    }

    // Auto-expand target group
    if (newParentId && store.collapsedGroupIds.has(newParentId)) {
      store.toggleGroupCollapsed(newParentId);
    }

    store.reorderWithinParent(dragged.id, newParentId, targetSiblingId, position);

    // Persist all changes
    const updatedActivities = useGanttStore.getState().activities;
    const parentChanged = dragged.parent_id !== newParentId;
    try {
      await bulkUpdateActivities(
        updatedActivities.map((a) => ({
          id: a.id,
          sort_order: a.sort_order,
          ...(a.id === dragged.id && parentChanged
            ? { parent_id: newParentId }
            : {}),
        }))
      );
    } catch {
      toast.error("Failed to save changes");
    }
  };

  const handleDragCancel = () => {
    setDraggedId(null);
    setOverGroupId(null);
    setOverUngroup(false);
  };

  const handleAddActivity = async () => {
    try {
      const newActivity = await createActivity(chartId);
      useGanttStore.getState().addActivity(newActivity);
    } catch {
      toast.error("Failed to add activity");
    }
  };

  const handleAddGroup = async () => {
    try {
      const newGroup = await createActivity(chartId, null, true);
      useGanttStore.getState().addActivity(newGroup);
    } catch {
      toast.error("Failed to add group");
    }
  };

  return (
    <div className="w-60 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Activities
        </span>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddGroup}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Add group"
            >
              <FolderClosed size={14} />
            </button>
            <button
              onClick={handleAddActivity}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Add activity"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={displayRows.map((r) => r.activity.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayRows.map((row) => (
              <SortableRow
                key={row.activity.id}
                row={row}
                rowHeight={rowHeight}
                chartId={chartId}
                isDropTarget={
                  overGroupId === row.activity.id &&
                  draggedId !== row.activity.id
                }
              />
            ))}
          </SortableContext>

          {/* Ungroup drop zone — shown when dragging a child activity */}
          {showUngroupZone && (
            <UngroupDropZone isOver={overUngroup} />
          )}
        </DndContext>
      </div>
    </div>
  );
}
