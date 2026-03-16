"use client";

import { Plus } from "lucide-react";
import { createChart } from "@/lib/actions/chart-actions";
import { useState } from "react";

export function CreateChartButton() {
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createChart();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-navy)] text-white rounded-lg hover:bg-[var(--brand-navy-light)] transition-colors font-medium text-sm disabled:opacity-50"
    >
      <Plus size={18} />
      {loading ? "Creating..." : "New Chart"}
    </button>
  );
}
