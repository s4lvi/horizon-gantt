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
    <div className="flex flex-col gap-1 md:gap-0 md:flex-row md:items-center md:justify-between px-3 pt-3 pb-2 md:px-4 md:py-3 bg-white border-b border-gray-200" data-print-hide>
      <div className="flex items-center gap-2 pl-11 md:pl-0 mb-1 md:mb-0">
        {canEdit ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="text-base md:text-lg font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-[var(--brand-navy)] rounded px-1 w-full md:w-auto"
          />
        ) : (
          <h1 className="text-base md:text-lg font-bold text-gray-900">{chart.title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-md transition-colors ${
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
          className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export as CSV"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Print chart"
        >
          <Printer size={16} />
          <span className="hidden sm:inline">Print</span>
        </button>

        {isOwner && (
          <>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("toggle-share-dialog"));
              }}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Share</span>
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
