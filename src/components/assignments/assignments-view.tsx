"use client";

import { useState, useMemo, useEffect } from "react";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { isPastDue } from "@/lib/utils/dates";
import { updateChecklistItem } from "@/lib/actions/checklist-actions";
import { getPublicScheduleLink } from "@/lib/actions/share-actions";
import { AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import { toast } from "sonner";

function ActivityRow({
  a,
  weekStart,
  weekEnd,
  canEdit,
}: {
  a: any;
  weekStart: Date;
  weekEnd: Date;
  canEdit: boolean;
}) {
  const done = !a.is_group && a.is_done;
  const overdue = !a.is_group && !a.is_done && isPastDue(a.end_date);
  const endsThisWeek =
    !done && !overdue && a.end_date
      ? isWithinInterval(parseISO(a.end_date), { start: weekStart, end: weekEnd })
      : false;

  const allItems = useMemo(
    () =>
      [...(a.checklist_items || [])].sort(
        (x: any, y: any) => x.sort_order - y.sort_order
      ),
    [a.checklist_items]
  );
  // Live checkbox state; items unchecked at load stay visible after checking
  // (strikethrough) so a mis-click can be undone without a reload.
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allItems.map((i: any) => [i.id, i.is_done]))
  );
  // Pick up items added/changed if the props ever refresh without a remount.
  useEffect(() => {
    setChecked((prev) => {
      const next = { ...prev };
      for (const item of allItems) {
        if (!(item.id in next)) next[item.id] = item.is_done;
      }
      return next;
    });
  }, [allItems]);
  const visibleItems = allItems.filter((i: any) => !i.is_done);
  const doneCount = allItems.filter((i: any) => checked[i.id]).length;

  const toggleItem = (item: any) => {
    if (!canEdit) return;
    const next = !checked[item.id];
    setChecked((c) => ({ ...c, [item.id]: next }));
    updateChecklistItem(item.id, { is_done: next }).catch(() => {
      setChecked((c) => ({ ...c, [item.id]: !next }));
      toast.error("Failed to update checklist");
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-navy-light)] hover:shadow-sm transition-all">
      <a
        href={`/charts/${a.charts?.id || a.chart_id}`}
        className="flex items-center gap-3 p-3"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: a.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">
              {a.title}
            </span>
            {a.profiles?.full_name && (
              <span className="text-xs text-gray-400">{a.profiles.full_name}</span>
            )}
            {allItems.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium tabular-nums">
                {doneCount}/{allItems.length}
              </span>
            )}
            {done && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                <CheckCircle2 size={11} />
                Done
              </span>
            )}
            {overdue && (
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                <AlertTriangle size={11} />
                Overdue
              </span>
            )}
            {endsThisWeek && (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Finishes this week
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {a.charts?.title} ·{" "}
            {a.start_date ? format(parseISO(a.start_date), "MMM d") : "—"} →{" "}
            {a.end_date ? format(parseISO(a.end_date), "MMM d") : "—"}
          </span>
        </div>
      </a>

      {visibleItems.length > 0 && (
        <div className="px-3 pb-3 pl-9 space-y-1">
          {visibleItems.map((item: any) => (
            <label
              key={item.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!checked[item.id]}
                disabled={!canEdit}
                onChange={() => toggleItem(item)}
                className="accent-green-600 flex-shrink-0 cursor-pointer disabled:cursor-default"
              />
              <span
                className={`text-sm truncate ${
                  checked[item.id]
                    ? "line-through text-gray-400"
                    : "text-gray-700"
                }`}
              >
                {item.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Overdue: a leaf activity whose end date is in the past and isn't marked done.
function isOverdue(a: any): boolean {
  return !a.is_group && !a.is_done && isPastDue(a.end_date);
}

function filterOverdue(activities: any[]) {
  return activities.filter(isOverdue);
}

function filterThisWeek(activities: any[], weekStart: Date, weekEnd: Date) {
  return activities.filter((a: any) => {
    if (!a.start_date || !a.end_date) return false;
    // Overdue items get their own section — don't also list them here.
    if (isOverdue(a)) return false;
    const start = parseISO(a.start_date);
    const end = parseISO(a.end_date);
    return (
      isWithinInterval(weekStart, { start, end }) ||
      isWithinInterval(weekEnd, { start, end }) ||
      isWithinInterval(start, { start: weekStart, end: weekEnd }) ||
      isWithinInterval(end, { start: weekStart, end: weekEnd })
    );
  });
}

function filterUpcoming(activities: any[], weekEnd: Date) {
  return activities.filter((a: any) => {
    if (!a.start_date) return false;
    return parseISO(a.start_date) > weekEnd;
  });
}

export function AssignmentsView({
  myActivities,
  allActivities,
  projects,
  orgs,
  editableChartIds,
  ownedChartIds,
}: {
  myActivities: any[];
  allActivities: any[];
  projects: any[];
  orgs: any[];
  editableChartIds: string[];
  ownedChartIds: string[];
}) {
  const [tab, setTab] = useState<"mine" | "project">("mine");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const editableSet = useMemo(() => new Set(editableChartIds), [editableChartIds]);
  const ownedSet = useMemo(() => new Set(ownedChartIds), [ownedChartIds]);

  const handleCopyPublicLink = async () => {
    try {
      const token = await getPublicScheduleLink(selectedProjectId);
      await navigator.clipboard.writeText(
        `${window.location.origin}/schedule/${token}`
      );
      toast.success("Public schedule link copied");
    } catch {
      toast.error("Failed to create link");
    }
  };

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const sourceActivities = useMemo(() => {
    if (tab === "mine") return myActivities;
    if (selectedProjectId === "all") return allActivities;
    return allActivities.filter((a: any) => a.chart_id === selectedProjectId);
  }, [tab, selectedProjectId, myActivities, allActivities]);

  const overdue = filterOverdue(sourceActivities);
  const thisWeek = filterThisWeek(sourceActivities, weekStart, weekEnd);
  const upcoming = filterUpcoming(sourceActivities, weekEnd);

  // Group projects by org for the dropdown
  const orgMap = new Map(orgs.map((o: any) => [o.id, o]));

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
        Schedule
      </h1>

      {/* Tabs and filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab("mine")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "mine"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Assigned to Me
          </button>
          <button
            onClick={() => setTab("project")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "project"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Project
          </button>
        </div>

        {tab === "project" && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p: any) => {
              const org = p.organization_id ? orgMap.get(p.organization_id) : null;
              return (
                <option key={p.id} value={p.id}>
                  {org ? `${org.name} / ` : ""}{p.title}
                </option>
              );
            })}
          </select>
        )}

        {tab === "project" &&
          selectedProjectId !== "all" &&
          ownedSet.has(selectedProjectId) && (
            <button
              onClick={handleCopyPublicLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Copy a link that shows this project's schedule without signing in"
            >
              <Link2 size={14} />
              Copy public link
            </button>
          )}
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            Overdue
            <span className="text-sm font-normal text-red-400">
              {overdue.length}
            </span>
          </h2>
          <div className="space-y-2">
            {overdue.map((a: any) => (
              <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} canEdit={editableSet.has(a.chart_id)} />
            ))}
          </div>
        </section>
      )}

      {/* This Week */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          This Week
          <span className="text-sm font-normal text-gray-500">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
          </span>
        </h2>
        {thisWeek.length > 0 ? (
          <div className="space-y-2">
            {thisWeek.map((a: any) => (
              <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} canEdit={editableSet.has(a.chart_id)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-sm">
              {tab === "mine" ? "Nothing assigned to you this week" : "No activities this week"}
            </p>
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((a: any) => (
              <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} canEdit={editableSet.has(a.chart_id)} />
            ))}
          </div>
        </section>
      )}

      {sourceActivities.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">
            {tab === "mine"
              ? "No activities assigned to you yet."
              : "No activities in this project."}
          </p>
        </div>
      )}
    </div>
  );
}
