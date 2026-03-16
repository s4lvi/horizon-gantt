import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BarChart3, Building2, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ChartCard({
  chart,
  permission,
}: {
  chart: any;
  permission?: string;
}) {
  return (
    <Link
      href={`/charts/${chart.id}`}
      className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-500" />
          <h3 className="font-semibold text-gray-900 truncate">{chart.title}</h3>
        </div>
        {permission && (
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              permission === "edit"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {permission === "edit" ? (
              <span className="flex items-center gap-1">
                <Pencil size={10} /> Edit
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Eye size={10} /> View
              </span>
            )}
          </span>
        )}
      </div>
      {chart.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {chart.description}
        </p>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
        {chart.organizations?.name && (
          <span className="flex items-center gap-1">
            <Building2 size={12} />
            {chart.organizations.name}
          </span>
        )}
        <span>
          Updated{" "}
          {formatDistanceToNow(new Date(chart.updated_at), {
            addSuffix: true,
          })}
        </span>
      </div>
    </Link>
  );
}
