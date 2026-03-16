"use client";

import { Plus } from "lucide-react";
import { createChart } from "@/lib/actions/chart-actions";
import { useState } from "react";

export function CreateOrgChartButton({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createChart(orgId);
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
    >
      <Plus size={18} />
      {loading ? "Creating..." : "New Chart"}
    </button>
  );
}
