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
            Project planning,
            <br />
            <span style={{ color: "#C11616" }}>made visual.</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Plan, schedule, and collaborate with interactive Gantt charts.
            Drag-and-drop timelines with dependency management built in.
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
              title: "Visual Planning",
              desc: "Drag and drop activities on an interactive timeline with multiple view modes.",
            },
            {
              icon: Users,
              title: "Team Collaboration",
              desc: "Create organizations, invite members, and assign work to your team.",
            },
            {
              icon: Share2,
              title: "Flexible Sharing",
              desc: "Share charts with view or edit permissions. Everyone stays in sync.",
            },
            {
              icon: Calendar,
              title: "Dependencies",
              desc: "Link activities together. Moving one automatically adjusts its dependents.",
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
