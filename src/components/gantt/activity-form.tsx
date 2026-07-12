"use client";

import { useState } from "react";
import { Activity, ChecklistItem, Profile } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { updateActivity } from "@/lib/actions/activity-actions";
import {
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "@/lib/actions/checklist-actions";
import {
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { isPastDue } from "@/lib/utils/dates";

const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
  "#84CC16", "#D946EF",
];

export function ActivityForm({
  activity,
  members,
  chartId,
}: {
  activity: Activity;
  members: Profile[];
  chartId: string;
}) {
  const { activities, canEdit, updateActivity: updateStore, setSelectedActivityId } =
    useGanttStore();
  const [expanded, setExpanded] = useState(false);

  const groups = activities.filter(
    (a) => a.is_group && a.id !== activity.id
  );

  const showPastDue =
    !activity.is_group && !activity.is_done && isPastDue(activity.end_date);

  const handleUpdate = async (updates: Partial<Activity>) => {
    if (!canEdit) return;
    const prev: Partial<Activity> = {};
    for (const key of Object.keys(updates) as (keyof Activity)[]) {
      (prev as any)[key] = activity[key];
    }
    updateStore(activity.id, updates);
    try {
      await updateActivity(activity.id, updates as any);
    } catch {
      updateStore(activity.id, prev);
      toast.error("Failed to update activity");
    }
  };

  const checklist = [...(activity.checklist_items || [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const checklistDone = checklist.filter((i) => i.is_done).length;
  const [newItemTitle, setNewItemTitle] = useState("");

  const setChecklist = (items: ChecklistItem[]) =>
    updateStore(activity.id, { checklist_items: items });

  const handleAddItem = async () => {
    const title = newItemTitle.trim();
    if (!title || !canEdit) return;
    setNewItemTitle("");
    try {
      const item = await createChecklistItem(activity.id, title);
      setChecklist([...(activity.checklist_items || []), item]);
    } catch {
      setNewItemTitle(title);
      toast.error("Failed to add checklist item");
    }
  };

  const handleToggleItem = (item: ChecklistItem) => {
    if (!canEdit) return;
    const prevItems = activity.checklist_items || [];
    setChecklist(
      checklist.map((i) =>
        i.id === item.id ? { ...i, is_done: !item.is_done } : i
      )
    );
    updateChecklistItem(item.id, { is_done: !item.is_done }).catch(() => {
      setChecklist(prevItems);
      toast.error("Failed to update checklist item");
    });
  };

  const handleDeleteItem = (item: ChecklistItem) => {
    if (!canEdit) return;
    const prevItems = activity.checklist_items || [];
    setChecklist(checklist.filter((i) => i.id !== item.id));
    deleteChecklistItem(item.id).catch(() => {
      setChecklist(prevItems);
      toast.error("Failed to delete checklist item");
    });
  };

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2 md:px-4 md:py-3 max-h-[60vh] overflow-y-auto md:max-h-none md:overflow-visible" data-print-hide>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">
            {activity.is_group ? "Group Details" : "Activity Details"}
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-0.5"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {expanded ? "Less" : "More"}
          </button>

          {!activity.is_group && (
            <button
              onClick={() => handleUpdate({ is_done: !activity.is_done })}
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border transition-colors ${
                activity.is_done
                  ? "border-green-500 text-green-600 bg-green-50 hover:bg-green-100"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
              title={activity.is_done ? "Mark as not done" : "Mark as done"}
            >
              {activity.is_done ? (
                <CheckCircle2 size={14} />
              ) : (
                <Circle size={14} />
              )}
              {activity.is_done ? "Done" : "Mark done"}
            </button>
          )}

          {showPastDue && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-500">
              <AlertTriangle size={14} />
              Past due
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedActivityId(null)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X size={16} />
        </button>
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Title
          </label>
          <input
            value={activity.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Assignee
          </label>
          <select
            value={activity.assignee_id || ""}
            onChange={(e) =>
              handleUpdate({ assignee_id: e.target.value || null })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
        </div>

        {!activity.is_group && groups.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Group
            </label>
            <select
              value={activity.parent_id || ""}
              onChange={(e) =>
                handleUpdate({ parent_id: e.target.value || null })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Dates
          </label>
          {activity.is_group ? (
            <div className="text-xs text-gray-400 italic pt-1">
              Computed from children
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={activity.start_date || ""}
                onChange={(e) =>
                  handleUpdate({
                    start_date: e.target.value || null,
                    ...(!activity.end_date && e.target.value
                      ? { end_date: e.target.value }
                      : {}),
                  })
                }
                className="px-1.5 py-1 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
              />
              <span className="text-gray-400 text-xs">→</span>
              <input
                type="date"
                value={activity.end_date || ""}
                min={activity.start_date || undefined}
                onChange={(e) =>
                  handleUpdate({ end_date: e.target.value || null })
                }
                className="px-1.5 py-1 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Color
          </label>
          <div className="flex flex-wrap gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  activity.color === color
                    ? "border-gray-800 scale-110"
                    : "border-transparent hover:border-gray-300"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleUpdate({ color })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded detail fields */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={activity.description || ""}
              onChange={(e) => handleUpdate({ description: e.target.value || null })}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Notes
            </label>
            <textarea
              value={activity.notes || ""}
              onChange={(e) => handleUpdate({ notes: e.target.value || null })}
              placeholder="Internal notes..."
              rows={3}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none resize-none"
            />
          </div>
          {!activity.is_group && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Checklist
                {checklist.length > 0 && (
                  <span className="ml-1 text-gray-400 font-normal">
                    ({checklistDone}/{checklist.length})
                  </span>
                )}
              </label>
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 group/check"
                  >
                    <input
                      type="checkbox"
                      checked={item.is_done}
                      onChange={() => handleToggleItem(item)}
                      className="accent-green-600 flex-shrink-0 cursor-pointer"
                    />
                    <span
                      className={`flex-1 text-sm truncate ${
                        item.is_done
                          ? "line-through text-gray-400"
                          : "text-gray-700"
                      }`}
                    >
                      {item.title}
                    </span>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="opacity-0 group-hover/check:opacity-100 text-gray-300 hover:text-red-500 transition-opacity flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddItem();
                    }}
                    placeholder="Add item..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemTitle.trim()}
                    className="p-1 text-gray-400 hover:text-[var(--brand-navy)] disabled:opacity-40 disabled:hover:text-gray-400"
                    title="Add item"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
