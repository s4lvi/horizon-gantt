import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: orgs } = await admin
    .from("organization_members")
    .select("organization_id, organizations(id, name)")
    .eq("user_id", user.id);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        profile={profile}
        organizations={orgs?.map((o: any) => o.organizations) || []}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
