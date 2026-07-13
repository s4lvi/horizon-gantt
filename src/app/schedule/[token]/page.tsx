import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { PublicSchedule } from "@/components/assignments/public-schedule";

// Token-gated public view — no session, and the schedule changes daily.
export const dynamic = "force-dynamic";

export default async function PublicSchedulePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: link } = await admin
    .from("chart_share_links")
    .select("chart_id, expires_at")
    .eq("token", token)
    .single();
  if (!link) notFound();
  if (link.expires_at && new Date(link.expires_at) < new Date()) notFound();

  const { data: chart } = await admin
    .from("charts")
    .select("id, title, deleted_at")
    .eq("id", link.chart_id)
    .single();
  if (!chart || chart.deleted_at) notFound();

  const { data: activities } = await admin
    .from("activities")
    .select(
      "*, profiles(id, email, full_name), checklist_items:activity_checklist_items(*)"
    )
    .eq("chart_id", chart.id)
    .eq("is_group", false)
    .order("start_date", { ascending: true });

  return <PublicSchedule chartTitle={chart.title} activities={activities || []} />;
}
