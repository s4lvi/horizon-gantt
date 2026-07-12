import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { GanttChart } from "@/components/gantt/gantt-chart";

export default async function ChartPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  const { chartId } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: chart } = await admin
    .from("charts")
    .select("*")
    .eq("id", chartId)
    .single();

  if (!chart) notFound();

  const [{ data: activities }, { data: dependencies }] = await Promise.all([
    admin
      .from("activities")
      .select(
        "*, profiles(id, email, full_name, avatar_url), checklist_items:activity_checklist_items(*)"
      )
      .eq("chart_id", chartId)
      .order("sort_order", { ascending: true }),
    admin.from("dependencies").select("*").eq("chart_id", chartId),
  ]);

  // Determine edit permission
  const isOwner = chart.owner_id === user.id;
  let canEdit = isOwner;

  if (!canEdit) {
    const { data: share } = await admin
      .from("chart_shares")
      .select("permission")
      .eq("chart_id", chartId)
      .eq("user_id", user.id)
      .single();

    if (share?.permission === "edit") canEdit = true;
  }

  if (!canEdit && chart.organization_id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", chart.organization_id)
      .eq("user_id", user.id)
      .single();

    if (membership) canEdit = true;
  }

  // Org members, chart shares, and owner profile for the assignee dropdown
  const [orgMembersResult, sharesResult, ownerResult] = await Promise.all([
    chart.organization_id
      ? admin
          .from("organization_members")
          .select("user_id, profiles(id, email, full_name, avatar_url)")
          .eq("organization_id", chart.organization_id)
      : Promise.resolve({ data: null }),
    admin
      .from("chart_shares")
      .select("user_id, profiles(id, email, full_name, avatar_url)")
      .eq("chart_id", chartId),
    admin
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .eq("id", chart.owner_id)
      .single(),
  ]);

  const members = orgMembersResult.data?.map((m: any) => m.profiles) || [];
  const shareMembers = sharesResult.data?.map((s: any) => s.profiles) || [];
  const ownerProfile = ownerResult.data;

  const allMembers = [
    ownerProfile,
    ...members,
    ...shareMembers,
  ].filter(
    (m, i, arr) => m && arr.findIndex((x: any) => x?.id === m?.id) === i
  );

  return (
    <GanttChart
      chart={chart}
      initialActivities={activities || []}
      initialDependencies={dependencies || []}
      canEdit={canEdit}
      isOwner={isOwner}
      members={allMembers}
      currentUserId={user.id}
    />
  );
}
