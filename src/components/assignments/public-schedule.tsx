import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { isPastDue } from "@/lib/utils/dates";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// Read-only, unauthenticated rendering of one chart's schedule.
// Server component — no interactivity, mirrors the app's Schedule view.

function ActivityRow({
  a,
  weekStart,
  weekEnd,
}: {
  a: any;
  weekStart: Date;
  weekEnd: Date;
}) {
  const done = a.is_done;
  const overdue = !a.is_done && isPastDue(a.end_date);
  const endsThisWeek =
    !done && !overdue && a.end_date
      ? isWithinInterval(parseISO(a.end_date), { start: weekStart, end: weekEnd })
      : false;

  const items = [...(a.checklist_items || [])].sort(
    (x: any, y: any) => x.sort_order - y.sort_order
  );
  const openItems = items.filter((i: any) => !i.is_done);
  const doneCount = items.length - openItems.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 p-3">
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
            {items.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium tabular-nums">
                {doneCount}/{items.length}
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
            {a.start_date ? format(parseISO(a.start_date), "MMM d") : "—"} →{" "}
            {a.end_date ? format(parseISO(a.end_date), "MMM d") : "—"}
          </span>
        </div>
      </div>

      {openItems.length > 0 && (
        <div className="px-3 pb-3 pl-9 space-y-1">
          {openItems.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="w-3 h-3 border border-gray-300 rounded-sm flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate">{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicSchedule({
  chartTitle,
  activities,
}: {
  chartTitle: string;
  activities: any[];
}) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const overdue = activities.filter(
    (a) => !a.is_done && isPastDue(a.end_date)
  );
  const overdueIds = new Set(overdue.map((a) => a.id));
  const thisWeek = activities.filter((a) => {
    if (overdueIds.has(a.id) || !a.start_date || !a.end_date) return false;
    const start = parseISO(a.start_date);
    const end = parseISO(a.end_date);
    return (
      isWithinInterval(weekStart, { start, end }) ||
      isWithinInterval(weekEnd, { start, end }) ||
      isWithinInterval(start, { start: weekStart, end: weekEnd }) ||
      isWithinInterval(end, { start: weekStart, end: weekEnd })
    );
  });
  const upcoming = activities.filter(
    (a) => a.start_date && parseISO(a.start_date) > weekEnd
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <img src="/horizon-logo.svg" alt="" className="w-6 h-6 rounded" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {chartTitle}
          </h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
        </p>

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
              {overdue.map((a) => (
                <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">This Week</h2>
          {thisWeek.length > 0 ? (
            <div className="space-y-2">
              {thisWeek.map((a) => (
                <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm">No activities this week</p>
            </div>
          )}
        </section>

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming</h2>
            <div className="space-y-2">
              {upcoming.map((a) => (
                <ActivityRow key={a.id} a={a} weekStart={weekStart} weekEnd={weekEnd} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
