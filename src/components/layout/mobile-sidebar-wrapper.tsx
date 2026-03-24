"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Profile, Organization } from "@/lib/types";

export function MobileSidebarWrapper({
  profile,
  organizations,
  children,
}: {
  profile: Profile | null;
  organizations: Organization[];
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — in document flow, not fixed */}
      <div className="md:hidden flex items-center gap-3 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700"
        >
          <Menu size={20} />
        </button>
        <span
          className="text-base font-bold text-gray-900"
          style={{ fontFamily: "'Eurostile', sans-serif" }}
        >
          Horizon Gantt
        </span>
      </div>

      {/* Mobile modal overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span
                className="text-lg font-bold text-gray-900"
                style={{ fontFamily: "'Eurostile', sans-serif" }}
              >
                Horizon Gantt
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                profile={profile}
                organizations={organizations}
                onNavigate={() => setMenuOpen(false)}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar + content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="hidden md:flex">
          <Sidebar profile={profile} organizations={organizations} />
        </div>
        {children}
      </div>
    </>
  );
}
