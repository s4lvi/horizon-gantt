"use client";

import { createOrganization } from "@/lib/actions/org-actions";
import { useState } from "react";
import { toast } from "sonner";

export default function NewOrganizationPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createOrganization(name.trim());
    } catch {
      toast.error("Failed to create organization");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create Organization
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Team"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full px-4 py-2 bg-[var(--brand-navy)] text-white rounded-lg hover:bg-[var(--brand-navy-light)] transition-colors font-medium disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Organization"}
        </button>
      </form>
    </div>
  );
}
