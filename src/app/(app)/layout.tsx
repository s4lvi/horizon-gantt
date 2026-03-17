import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MobileSidebarWrapper } from "@/components/layout/mobile-sidebar-wrapper";
import { Footer } from "@/components/layout/footer";

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
    .select("organization_id, organizations(id, name, logo_url)")
    .eq("user_id", user.id);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MobileSidebarWrapper
        profile={profile}
        organizations={orgs?.map((o: any) => o.organizations) || []}
      >
        <main className="flex-1 overflow-auto">{children}</main>
      </MobileSidebarWrapper>
      <Footer />
    </div>
  );
}
