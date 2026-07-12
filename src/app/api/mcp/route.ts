import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { createHash } from "crypto";
import { addDays, endOfWeek, format, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCanEditChart, assertCanViewChart } from "@/lib/authz";
import { isPastDue } from "@/lib/utils/dates";
import { cascadeDependencies } from "@/lib/utils/dependency-engine";
import { Activity } from "@/lib/types";

export const maxDuration = 60;

const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const userIdOf = (extra: any): string => {
  const userId = extra?.authInfo?.extra?.userId;
  if (!userId) throw new Error("Unauthorized");
  return userId as string;
};

const ACTIVITY_SELECT =
  "*, profiles(id, email, full_name), checklist_items:activity_checklist_items(*)";

function formatActivity(a: any) {
  return {
    id: a.id,
    title: a.title,
    is_group: a.is_group,
    parent_id: a.parent_id,
    start_date: a.start_date,
    end_date: a.end_date,
    is_done: a.is_done,
    past_due: !a.is_group && !a.is_done && isPastDue(a.end_date),
    assignee: a.profiles ? a.profiles.full_name || a.profiles.email : null,
    description: a.description,
    notes: a.notes,
    checklist: [...(a.checklist_items || [])]
      .sort((x: any, y: any) => x.sort_order - y.sort_order)
      .map((i: any) => ({ id: i.id, title: i.title, is_done: i.is_done })),
  };
}

type Admin = ReturnType<typeof createAdminClient>;

// Charts the user can see: owned, org-member, or shared.
async function accessibleCharts(admin: Admin, userId: string) {
  const [{ data: owned }, { data: memberships }, { data: shares }] =
    await Promise.all([
      admin
        .from("charts")
        .select("id, title, organization_id")
        .eq("owner_id", userId)
        .is("deleted_at", null),
      admin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId),
      admin.from("chart_shares").select("chart_id, permission").eq("user_id", userId),
    ]);

  const results = new Map<string, any>();
  for (const c of owned || []) results.set(c.id, { ...c, access: "owner" });

  const orgIds = (memberships || []).map((m: any) => m.organization_id);
  if (orgIds.length > 0) {
    const { data: orgCharts } = await admin
      .from("charts")
      .select("id, title, organization_id")
      .in("organization_id", orgIds)
      .is("deleted_at", null);
    for (const c of orgCharts || []) {
      if (!results.has(c.id)) results.set(c.id, { ...c, access: "organization" });
    }
  }

  const shareIds = (shares || []).map((s: any) => s.chart_id);
  if (shareIds.length > 0) {
    const { data: sharedCharts } = await admin
      .from("charts")
      .select("id, title, organization_id")
      .in("id", shareIds)
      .is("deleted_at", null);
    const permById = new Map((shares || []).map((s: any) => [s.chart_id, s.permission]));
    for (const c of sharedCharts || []) {
      if (!results.has(c.id)) {
        results.set(c.id, { ...c, access: `shared (${permById.get(c.id)})` });
      }
    }
  }

  return [...results.values()];
}

async function touchChart(admin: Admin, chartId: string) {
  await admin
    .from("charts")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chartId);
}

async function getActivityChartId(admin: Admin, activityId: string) {
  const { data } = await admin
    .from("activities")
    .select("chart_id")
    .eq("id", activityId)
    .single();
  if (!data) throw new Error("Activity not found");
  return data.chart_id as string;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "list_charts",
      {
        title: "List charts",
        description:
          "List all Gantt charts (projects) the authenticated user can access, with their access level.",
        inputSchema: {},
      },
      async (_args, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();
        return json(await accessibleCharts(admin, userId));
      }
    );

    server.registerTool(
      "get_chart",
      {
        title: "Get chart",
        description:
          "Get a chart's full contents: activities (with dates, done/past-due status, assignees, checklists) and dependencies.",
        inputSchema: { chart_id: z.string().uuid() },
      },
      async ({ chart_id }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();
        await assertCanViewChart(admin, userId, chart_id);

        const [{ data: chart }, { data: activities }, { data: dependencies }] =
          await Promise.all([
            admin.from("charts").select("id, title, description").eq("id", chart_id).single(),
            admin
              .from("activities")
              .select(ACTIVITY_SELECT)
              .eq("chart_id", chart_id)
              .order("sort_order", { ascending: true }),
            admin
              .from("dependencies")
              .select("id, predecessor_id, successor_id")
              .eq("chart_id", chart_id),
          ]);

        return json({
          chart,
          activities: (activities || []).map(formatActivity),
          dependencies: dependencies || [],
        });
      }
    );

    server.registerTool(
      "get_schedule",
      {
        title: "Get schedule",
        description:
          "Get overdue, this-week, and upcoming activities across all accessible charts (or one chart if chart_id is given). Mirrors the app's Schedule view.",
        inputSchema: { chart_id: z.string().uuid().optional() },
      },
      async ({ chart_id }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();

        let chartIds: string[];
        let titleById = new Map<string, string>();
        if (chart_id) {
          await assertCanViewChart(admin, userId, chart_id);
          chartIds = [chart_id];
        } else {
          const charts = await accessibleCharts(admin, userId);
          chartIds = charts.map((c) => c.id);
          titleById = new Map(charts.map((c) => [c.id, c.title]));
        }
        if (chartIds.length === 0) return json({ overdue: [], this_week: [], upcoming: [] });

        const { data: activities } = await admin
          .from("activities")
          .select(ACTIVITY_SELECT + ", charts(title)")
          .in("chart_id", chartIds)
          .eq("is_group", false)
          .order("start_date", { ascending: true });

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        const entry = (a: any) => ({
          ...formatActivity(a),
          chart: a.charts?.title || titleById.get(a.chart_id) || a.chart_id,
        });

        const leaf = activities || [];
        const overdue = leaf.filter((a: any) => !a.is_done && isPastDue(a.end_date));
        const overdueIds = new Set(overdue.map((a: any) => a.id));
        const thisWeek = leaf.filter((a: any) => {
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
        const upcoming = leaf.filter(
          (a: any) => a.start_date && parseISO(a.start_date) > weekEnd
        );

        return json({
          week: `${format(weekStart, "yyyy-MM-dd")} to ${format(weekEnd, "yyyy-MM-dd")}`,
          overdue: overdue.map(entry),
          this_week: thisWeek.map(entry),
          upcoming: upcoming.map(entry),
        });
      }
    );

    server.registerTool(
      "create_activity",
      {
        title: "Create activity",
        description:
          "Create a new activity (or group) in a chart. Dates are YYYY-MM-DD. parent_id nests the activity under a group.",
        inputSchema: {
          chart_id: z.string().uuid(),
          title: z.string().min(1).max(500),
          start_date: DATE.optional(),
          end_date: DATE.optional(),
          parent_id: z.string().uuid().optional(),
          is_group: z.boolean().optional(),
        },
      },
      async ({ chart_id, title, start_date, end_date, parent_id, is_group }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();
        await assertCanEditChart(admin, userId, chart_id);

        let query = admin
          .from("activities")
          .select("sort_order")
          .eq("chart_id", chart_id)
          .order("sort_order", { ascending: false })
          .limit(1);
        query = parent_id ? query.eq("parent_id", parent_id) : query.is("parent_id", null);
        const { data: existing } = await query;
        const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

        const { data, error } = await admin
          .from("activities")
          .insert({
            chart_id,
            title,
            start_date: start_date || null,
            end_date: end_date || null,
            parent_id: parent_id || null,
            is_group: is_group || false,
            sort_order: nextOrder,
            color: "#3B82F6",
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        await touchChart(admin, chart_id);
        return json(formatActivity(data));
      }
    );

    server.registerTool(
      "update_activity",
      {
        title: "Update activity",
        description:
          "Update an activity's title, description, notes, or dates (YYYY-MM-DD). Only provided fields change.",
        inputSchema: {
          activity_id: z.string().uuid(),
          title: z.string().min(1).max(500).optional(),
          description: z.string().max(5000).optional(),
          notes: z.string().max(5000).optional(),
          start_date: DATE.optional(),
          end_date: DATE.optional(),
        },
      },
      async ({ activity_id, ...updates }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();
        const chartId = await getActivityChartId(admin, activity_id);
        await assertCanEditChart(admin, userId, chartId);

        const fields = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined)
        );
        if (Object.keys(fields).length === 0) throw new Error("No fields to update");

        const { error } = await admin
          .from("activities")
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq("id", activity_id);
        if (error) throw new Error(error.message);
        await touchChart(admin, chartId);
        return json({ updated: activity_id, ...fields });
      }
    );

    server.registerTool(
      "set_activity_done",
      {
        title: "Mark activity done or not done",
        description: "Set an activity's done status (done activities show a green border in the app).",
        inputSchema: { activity_id: z.string().uuid(), done: z.boolean() },
      },
      async ({ activity_id, done }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();
        const chartId = await getActivityChartId(admin, activity_id);
        await assertCanEditChart(admin, userId, chartId);

        const { error } = await admin
          .from("activities")
          .update({ is_done: done, updated_at: new Date().toISOString() })
          .eq("id", activity_id);
        if (error) throw new Error(error.message);
        await touchChart(admin, chartId);
        return json({ activity_id, is_done: done });
      }
    );

    server.registerTool(
      "add_checklist_item",
      {
        title: "Add checklist item",
        description: "Add a todo item to an activity's checklist.",
        inputSchema: {
          activity_id: z.string().uuid(),
          title: z.string().min(1).max(500),
        },
      },
      async ({ activity_id, title }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();
        const chartId = await getActivityChartId(admin, activity_id);
        await assertCanEditChart(admin, userId, chartId);

        const { data: existing } = await admin
          .from("activity_checklist_items")
          .select("sort_order")
          .eq("activity_id", activity_id)
          .order("sort_order", { ascending: false })
          .limit(1);
        const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

        const { data, error } = await admin
          .from("activity_checklist_items")
          .insert({ activity_id, title, sort_order: nextOrder })
          .select("id, title, is_done")
          .single();
        if (error) throw new Error(error.message);
        return json(data);
      }
    );

    server.registerTool(
      "set_checklist_item_done",
      {
        title: "Check or uncheck checklist item",
        description: "Set a checklist item's done status.",
        inputSchema: { item_id: z.string().uuid(), done: z.boolean() },
      },
      async ({ item_id, done }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();

        const { data: item } = await admin
          .from("activity_checklist_items")
          .select("activity_id")
          .eq("id", item_id)
          .single();
        if (!item) throw new Error("Checklist item not found");
        const chartId = await getActivityChartId(admin, item.activity_id);
        await assertCanEditChart(admin, userId, chartId);

        const { error } = await admin
          .from("activity_checklist_items")
          .update({ is_done: done, updated_at: new Date().toISOString() })
          .eq("id", item_id);
        if (error) throw new Error(error.message);
        return json({ item_id, is_done: done });
      }
    );

    server.registerTool(
      "shift_activities",
      {
        title: "Shift activities in time",
        description:
          "Move activities forward (positive days) or backward (negative days). Group IDs shift all their children. Dependent activities cascade automatically, and all resulting date changes are saved.",
        inputSchema: {
          activity_ids: z.array(z.string().uuid()).min(1).max(100),
          days: z.number().int().min(-365).max(365),
        },
      },
      async ({ activity_ids, days }, extra) => {
        const userId = userIdOf(extra);
        const admin = createAdminClient();

        const { data: targets } = await admin
          .from("activities")
          .select("id, chart_id, is_group")
          .in("id", activity_ids);
        if (!targets || targets.length === 0) throw new Error("Activities not found");
        const chartIds = [...new Set(targets.map((t: any) => t.chart_id))];
        if (chartIds.length > 1) {
          throw new Error("All activities must belong to the same chart");
        }
        const chartId = chartIds[0];
        await assertCanEditChart(admin, userId, chartId);

        const [{ data: all }, { data: deps }] = await Promise.all([
          admin.from("activities").select("*").eq("chart_id", chartId),
          admin.from("dependencies").select("*").eq("chart_id", chartId),
        ]);
        const activities = (all || []) as Activity[];

        // Expand groups to their children; only dated leaf activities shift.
        const targetIds = new Set<string>();
        for (const t of targets) {
          if (t.is_group) {
            for (const child of activities.filter((a) => a.parent_id === t.id)) {
              targetIds.add(child.id);
            }
          } else {
            targetIds.add(t.id);
          }
        }

        let next = activities.map((a) => {
          if (!targetIds.has(a.id) || !a.start_date || !a.end_date) return a;
          return {
            ...a,
            start_date: format(addDays(parseISO(a.start_date), days), "yyyy-MM-dd"),
            end_date: format(addDays(parseISO(a.end_date), days), "yyyy-MM-dd"),
          };
        });
        for (const id of targetIds) {
          next = cascadeDependencies(next, (deps || []) as any, id);
        }

        const originalById = new Map(activities.map((a) => [a.id, a]));
        const changed = next.filter((a) => {
          const orig = originalById.get(a.id);
          return (
            orig &&
            (orig.start_date !== a.start_date || orig.end_date !== a.end_date)
          );
        });

        const timestamp = new Date().toISOString();
        const results = await Promise.all(
          changed.map((a) =>
            admin
              .from("activities")
              .update({
                start_date: a.start_date,
                end_date: a.end_date,
                updated_at: timestamp,
              })
              .eq("id", a.id)
          )
        );
        const failed = results.filter((r) => r.error);
        if (failed.length > 0) {
          throw new Error(`${failed.length} of ${changed.length} updates failed`);
        }
        await touchChart(admin, chartId);

        return json({
          shifted: changed.map((a) => ({
            id: a.id,
            title: a.title,
            start_date: a.start_date,
            end_date: a.end_date,
          })),
        });
      }
    );
  },
  {},
  { basePath: "/api", maxDuration: 60 }
);

// Bearer tokens are minted in Settings → API Tokens; only their SHA-256 hash is stored.
const verifyToken = async (_req: Request, bearerToken?: string) => {
  if (!bearerToken) return undefined;
  const tokenHash = createHash("sha256").update(bearerToken).digest("hex");
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", tokenHash)
    .single();
  if (!row) return undefined;

  await admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    token: bearerToken,
    scopes: ["gantt"],
    clientId: row.user_id,
    extra: { userId: row.user_id },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
