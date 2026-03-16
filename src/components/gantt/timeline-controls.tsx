"use client";

import { useGanttStore } from "@/lib/stores/gantt-store";
import { ViewMode, Chart } from "@/lib/types";
import { updateChart, deleteChart } from "@/lib/actions/chart-actions";
import { Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "months-days", label: "Months / Days" },
  { value: "months-weeks", label: "Months / Weeks" },
  { value: "weeks-days", label: "Weeks / Days" },
];

export function TimelineControls({
  chart,
  isOwner,
  canEdit,
}: {
  chart: Chart;
  isOwner: boolean;
  canEdit: boolean;
}) {
  const { viewMode, setViewMode } = useGanttStore();
  const [title, setTitle] = useState(chart.title);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleTitleBlur = async () => {
    if (title !== chart.title && canEdit) {
      try {
        await updateChart(chart.id, { title });
      } catch {
        toast.error("Failed to update title");
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this chart?")) return;
    try {
      await deleteChart(chart.id);
    } catch {
      toast.error("Failed to delete chart");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        {canEdit ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
          />
        ) : (
          <h1 className="text-lg font-bold text-gray-900">{chart.title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isOwner && (
          <>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("toggle-share-dialog"));
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 size={16} />
              Share
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
