import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BarChart3, Users, Share2, Calendar } from "lucide-react";
import { Footer } from "@/components/layout/footer";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Horizon Gantt</h1>
          <Link
            href="/login"
            className="px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-20 w-full">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            See the big picture.
            <br />
            <span style={{ color: "#C11616" }}>Ship on time.</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Horizon Gantt gives your team a shared timeline to plan work,
            track dependencies, and stay aligned from kickoff to delivery.
          </p>
          <Link
            href="/login"
            className="inline-flex px-6 py-3 text-white rounded-lg transition-colors font-semibold text-lg hover:opacity-90"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            Get Started Free
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: BarChart3,
              title: "Interactive Timelines",
              desc: "Drag, resize, and rearrange activities across day, week, or month views.",
            },
            {
              icon: Users,
              title: "Built for Teams",
              desc: "Create organizations, invite members, and assign ownership to every task.",
            },
            {
              icon: Share2,
              title: "Share Instantly",
              desc: "Send a link or invite by email with view-only or full edit access.",
            },
            {
              icon: Calendar,
              title: "Smart Dependencies",
              desc: "Link tasks so deadlines cascade automatically when plans change.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 bg-gray-50 rounded-xl border border-gray-100"
            >
              <feature.icon size={28} className="mb-3" style={{ color: "#C11616" }} />
              <h3 className="font-semibold text-gray-900 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
