import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CreateChartButton } from "@/components/dashboard/create-chart-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // My charts
  const { data: myCharts } = await admin
    .from("charts")
    .select("*, profiles(*), organizations(name)")
    .eq("owner_id", user!.id)
    .order("updated_at", { ascending: false });

  // Shared with me
  const { data: sharedCharts } = await admin
    .from("chart_shares")
    .select("permission, charts(*, profiles(*), organizations(name))")
    .eq("user_id", user!.id);

  // Org charts (not owned by me)
  const { data: orgMemberships } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user!.id);

  const orgIds = orgMemberships?.map((m: any) => m.organization_id) || [];
  let orgCharts: any[] = [];
  if (orgIds.length > 0) {
    const { data } = await admin
      .from("charts")
      .select("*, profiles(*), organizations(name)")
      .in("organization_id", orgIds)
      .neq("owner_id", user!.id)
      .order("updated_at", { ascending: false });
    orgCharts = data || [];
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <CreateChartButton />
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">My Projects</h2>
        {myCharts && myCharts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCharts.map((chart: any) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No projects yet. Create your first one!</p>
          </div>
        )}
      </section>

      {sharedCharts && sharedCharts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Shared with Me
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedCharts.map((share: any) => (
              <ChartCard
                key={share.charts.id}
                chart={share.charts}
                permission={share.permission}
              />
            ))}
          </div>
        </section>
      )}

      {orgCharts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Organization Projects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orgCharts.map((chart: any) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
