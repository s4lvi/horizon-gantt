import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check for pending org invites
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: invites } = await supabase
          .from("organization_invites")
          .select("id, organization_id")
          .eq("email", user.email);

        if (invites && invites.length > 0) {
          for (const invite of invites) {
            await supabase.from("organization_members").insert({
              organization_id: invite.organization_id,
              user_id: user.id,
              role: "member",
            });
            await supabase
              .from("organization_invites")
              .delete()
              .eq("id", invite.id);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
