"use client";

import { useState } from "react";
import { restoreChart } from "@/lib/actions/chart-actions";
import { Trash2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function DeletedProjects({ charts }: { charts: any[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(charts);

  const handleRestore = async (chartId: string) => {
    try {
      await restoreChart(chartId);
      setItems(items.filter((c) => c.id !== chartId));
      toast.success("Project restored");
    } catch {
      toast.error("Failed to restore project");
    }
  };

  if (items.length === 0) return null;

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 mb-3"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Trash2 size={14} />
        Deleted ({items.length})
      </button>

      {open && (
        <div className="space-y-2">
          {items.map((chart: any) => (
            <div
              key={chart.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-60"
            >
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {chart.title}
                </p>
                <p className="text-xs text-gray-400">
                  Deleted{" "}
                  {formatDistanceToNow(new Date(chart.deleted_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <button
                onClick={() => handleRestore(chart.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--brand-navy)] hover:bg-[#e8eef5] rounded transition-colors"
              >
                <RotateCcw size={12} />
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
