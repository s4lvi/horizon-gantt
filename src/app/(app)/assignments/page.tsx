import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval, isBefore } from "date-fns";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activities } = await admin
    .from("activities")
    .select("*, charts(id, title)")
    .eq("assignee_id", user!.id)
    .order("start_date", { ascending: true });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeek = (activities || []).filter((a: any) => {
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

  const upcoming = (activities || []).filter((a: any) => {
    if (!a.start_date) return false;
    return parseISO(a.start_date) > weekEnd;
  });

  const endsThisWeek = thisWeek.filter((a: any) => {
    if (!a.end_date) return false;
    const end = parseISO(a.end_date);
    return isWithinInterval(end, { start: weekStart, end: weekEnd });
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 md:mb-8">
        My Assignments
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          This Week
          <span className="text-sm font-normal text-gray-500">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
          </span>
        </h2>
        {thisWeek.length > 0 ? (
          <div className="space-y-2">
            {thisWeek.map((a: any) => {
              const finished = endsThisWeek.some((e: any) => e.id === a.id);
              return (
                <a
                  key={a.id}
                  href={`/charts/${a.charts?.id || a.chart_id}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-navy-light)] hover:shadow-sm transition-all"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: a.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {a.title}
                      </span>
                      {finished && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                          Finishes this week
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {a.charts?.title} · {a.start_date ? format(parseISO(a.start_date), "MMM d") : "—"} → {a.end_date ? format(parseISO(a.end_date), "MMM d") : "—"}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-sm">Nothing assigned this week</p>
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcoming.map((a: any) => (
              <a
                key={a.id}
                href={`/charts/${a.charts?.id || a.chart_id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-[var(--brand-navy-light)] hover:shadow-sm transition-all"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: a.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate block">
                    {a.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {a.charts?.title} · Starts {a.start_date ? format(parseISO(a.start_date), "MMM d") : "—"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {(!activities || activities.length === 0) && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No activities assigned to you yet.</p>
        </div>
      )}
    </div>
  );
}
