"use client";

import { Activity, Profile } from "@/lib/types";
import { useGanttStore } from "@/lib/stores/gantt-store";
import { updateActivity } from "@/lib/actions/activity-actions";
import { X } from "lucide-react";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/utils/dates";

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
  const { activities, updateActivity: updateStore, setSelectedActivityId } =
    useGanttStore();

  const groups = activities.filter(
    (a) => a.is_group && a.id !== activity.id
  );

  const handleUpdate = async (updates: Partial<Activity>) => {
    updateStore(activity.id, updates);
    try {
      await updateActivity(activity.id, updates as any);
    } catch {
      toast.error("Failed to update activity");
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3" data-print-hide>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          {activity.is_group ? "Group Details" : "Activity Details"}
        </h3>
        <button
          onClick={() => setSelectedActivityId(null)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
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

        {!activity.is_group && (
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
        )}

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
            <div className="text-xs text-gray-400 italic">
              Computed from children
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              {formatDateShort(activity.start_date)} →{" "}
              {formatDateShort(activity.end_date)}
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
                className={`w-6 h-6 rounded-full border-2 transition-all ${
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
    </div>
  );
}
