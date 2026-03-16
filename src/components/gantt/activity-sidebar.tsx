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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Activity, Profile } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import {
  createActivity,
  deleteActivity,
  updateActivity,
  bulkUpdateActivities,
} from "@/lib/actions/activity-actions";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

function SortableRow({
  activity,
  rowHeight,
  chartId,
}: {
  activity: Activity;
  rowHeight: number;
  chartId: string;
}) {
  const {
    canEdit,
    selectedActivityId,
    setSelectedActivityId,
    updateActivity: updateActivityStore,
    removeActivity,
  } = useGanttStore();

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 px-2 border-b border-gray-100 group",
        isDragging && "opacity-50 bg-gray-50",
        isSelected && "bg-blue-50"
      )}
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

      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: activity.color }}
      />

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
          className="flex-1 text-sm text-gray-700 truncate cursor-pointer min-w-0"
          onClick={() => {
            if (canEdit) setEditing(true);
            setSelectedActivityId(isSelected ? null : activity.id);
          }}
        >
          {activity.title}
        </span>
      )}

      {canEdit && (
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 flex-shrink-0 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function ActivitySidebar({
  activities,
  chartId,
  members,
  rowHeight,
}: {
  activities: Activity[];
  chartId: string;
  members: Profile[];
  rowHeight: number;
}) {
  const { canEdit, reorderActivities } = useGanttStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);

    reorderActivities(oldIndex, newIndex);

    // Persist new order
    const store = useGanttStore.getState();
    const updates = store.activities.map((a) => ({
      id: a.id,
      sort_order: a.sort_order,
    }));
    try {
      await bulkUpdateActivities(updates);
    } catch {
      toast.error("Failed to save order");
    }
  };

  const handleAddActivity = async () => {
    try {
      const newActivity = await createActivity(chartId);
      useGanttStore.getState().addActivity(newActivity);
    } catch {
      toast.error("Failed to add activity");
    }
  };

  return (
    <div className="w-60 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Activities
        </span>
        {canEdit && (
          <button
            onClick={handleAddActivity}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {activities.map((activity) => (
              <SortableRow
                key={activity.id}
                activity={activity}
                rowHeight={rowHeight}
                chartId={chartId}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
