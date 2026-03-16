"use client";

import { useGanttStore } from "@/lib/stores/gantt-store";
import { ViewMode, Chart } from "@/lib/types";
import { updateChart, deleteChart } from "@/lib/actions/chart-actions";
import { Share2, Trash2, Printer, Download } from "lucide-react";
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
  const { viewMode, setViewMode, activities } = useGanttStore();
  const [title, setTitle] = useState(chart.title);

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

  const handleExportCSV = () => {
    const sorted = [...activities].sort(
      (a, b) => a.sort_order - b.sort_order
    );

    const rows = [
      ["Title", "Start Date", "End Date", "Color", "Group", "Assignee"],
    ];
    for (const a of sorted) {
      const parent = a.parent_id
        ? activities.find((p) => p.id === a.parent_id)?.title || ""
        : "";
      rows.push([
        a.title,
        a.start_date || "",
        a.end_date || "",
        a.color,
        parent,
        a.profiles?.full_name || a.profiles?.email || "",
      ]);
    }

    const csv = rows
      .map((r) =>
        r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200" data-print-hide>
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

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export as CSV"
        >
          <Download size={16} />
          Export
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Print chart"
        >
          <Printer size={16} />
          Print
        </button>

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
