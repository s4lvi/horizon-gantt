"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";

function ActivityRow({ a, weekStart, weekEnd }: { a: any; weekStart: Date; weekEnd: Date }) {
  const endsThisWeek = a.end_date
    ? isWithinInterval(parseISO(a.end_date), { start: weekStart, end: weekEnd })
    : false;

  return (
    <a
      href={`/charts/${a.charts?.id || a.chart_id}`}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-navy-light)] hover:shadow-sm transition-all"
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
  );
}

function filterThisWeek(activities: any[], weekStart: Date, weekEnd: Date) {
  return activities.filter((a: any) => {
    if (!a.start_date || !a.end_date) return false;
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
  currentUserId,
}: {
  myActivities: any[];
  allActivities: any[];
  projects: any[];
  orgs: any[];
  currentUserId: string;
}) {
  const [tab, setTab] = useState<"mine" | "project">("mine");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const sourceActivities = useMemo(() => {
    if (tab === "mine") return myActivities;
    if (selectedProjectId === "all") return allActivities;
    return allActivities.filter((a: any) => a.chart_id === selectedProjectId);
  }, [tab, selectedProjectId, myActivities, allActivities]);

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
      </div>

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
              <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} />
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
              <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} />
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
