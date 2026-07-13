import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssignmentsView } from "@/components/assignments/assignments-view";

const PROFILE_FIELDS = "profiles(id, email, full_name, avatar_url)";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: myActivities },
    { data: myCharts },
    { data: orgMemberships },
    { data: editShares },
  ] = await Promise.all([
    // My assignments
    admin
      .from("activities")
      .select(
        `*, charts(id, title, organization_id), ${PROFILE_FIELDS}, checklist_items:activity_checklist_items(*)`
      )
      .eq("assignee_id", user!.id)
      .order("start_date", { ascending: true }),
    // My projects (not deleted)
    admin
      .from("charts")
      .select("id, title, organization_id")
      .eq("owner_id", user!.id)
      .is("deleted_at", null),
    // Org memberships
    admin
      .from("organization_members")
      .select("organization_id, organizations(id, name, logo_url)")
      .eq("user_id", user!.id),
    // Charts shared with me with edit permission
    admin
      .from("chart_shares")
      .select("chart_id")
      .eq("user_id", user!.id)
      .eq("permission", "edit"),
  ]);

  const orgIds = orgMemberships?.map((m: any) => m.organization_id) || [];

  // Org projects
  let orgCharts: any[] = [];
  if (orgIds.length > 0) {
    const { data } = await admin
      .from("charts")
      .select("id, title, organization_id")
      .in("organization_id", orgIds)
      .is("deleted_at", null);
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
      .select(
        `*, charts(id, title, organization_id), ${PROFILE_FIELDS}, checklist_items:activity_checklist_items(*)`
      )
      .in("chart_id", uniqueChartIds)
      .order("start_date", { ascending: true });
    allActivities = data || [];
  }

  const projects = [
    ...(myCharts || []),
    ...orgCharts,
  ].filter((c, i, arr) => arr.findIndex((x: any) => x.id === c.id) === i);

  const orgs = orgMemberships?.map((m: any) => m.organizations) || [];

  // Charts the user can edit: owned, org-member, or edit-share.
  const editableChartIds = [
    ...new Set([
      ...uniqueChartIds,
      ...(editShares || []).map((s: any) => s.chart_id),
    ]),
  ];

  return (
    <AssignmentsView
      myActivities={myActivities || []}
      allActivities={allActivities}
      projects={projects}
      orgs={orgs}
      editableChartIds={editableChartIds}
      ownedChartIds={(myCharts || []).map((c: any) => c.id)}
    />
  );
}
