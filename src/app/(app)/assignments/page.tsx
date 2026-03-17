import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssignmentsView } from "@/components/assignments/assignments-view";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // My assignments
  const { data: myActivities } = await admin
    .from("activities")
    .select("*, charts(id, title, organization_id), profiles(*)")
    .eq("assignee_id", user!.id)
    .order("start_date", { ascending: true });

  // My projects (all activities)
  const { data: myCharts } = await admin
    .from("charts")
    .select("id, title, organization_id")
    .eq("owner_id", user!.id);

  // Org memberships
  const { data: orgMemberships } = await admin
    .from("organization_members")
    .select("organization_id, organizations(id, name, logo_url)")
    .eq("user_id", user!.id);

  const orgIds = orgMemberships?.map((m: any) => m.organization_id) || [];

  // Org projects
  let orgCharts: any[] = [];
  if (orgIds.length > 0) {
    const { data } = await admin
      .from("charts")
      .select("id, title, organization_id")
      .in("organization_id", orgIds);
    orgCharts = data || [];
  }

  // All activities for projects the user owns or is in org for
  const allChartIds = [
    ...(myCharts || []).map((c: any) => c.id),
    ...orgCharts.map((c: any) => c.id),
  ];
  const uniqueChartIds = [...new Set(allChartIds)];

  let allActivities: any[] = [];
  if (uniqueChartIds.length > 0) {
    const { data } = await admin
      .from("activities")
      .select("*, charts(id, title, organization_id), profiles(*)")
      .in("chart_id", uniqueChartIds)
      .order("start_date", { ascending: true });
    allActivities = data || [];
  }

  const projects = [
    ...(myCharts || []),
    ...orgCharts,
  ].filter((c, i, arr) => arr.findIndex((x: any) => x.id === c.id) === i);

  const orgs = orgMemberships?.map((m: any) => m.organizations) || [];

  return (
    <AssignmentsView
      myActivities={myActivities || []}
      allActivities={allActivities}
      projects={projects}
      orgs={orgs}
      currentUserId={user!.id}
    />
  );
}
