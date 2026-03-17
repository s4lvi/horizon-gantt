"use client";

import { useState } from "react";
import { updateOrganization } from "@/lib/actions/org-actions";
import { X, Building2 } from "lucide-react";
import { toast } from "sonner";

export function OrgSettingsModal({
  open,
  onClose,
  org,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  org: any;
  orgId: string;
}) {
  const [name, setName] = useState(org?.name || "");
  const [desc, setDesc] = useState(org?.description || "");
  const [location, setLocation] = useState(org?.location || "");
  const [logo, setLogo] = useState(org?.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", orgId);
      const res = await fetch("/api/upload-logo", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setLogo(result.url);
      toast.success("Logo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganization(orgId, {
        name: name || org?.name,
        description: desc || null,
        location: location || null,
      });
      toast.success("Organization updated");
      onClose();
    } catch {
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Organization Settings</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Logo</label>
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                  <Building2 size={20} />
                </div>
              )}
              <label className={`cursor-pointer px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 transition-colors ${
                uploading ? "text-gray-400 bg-gray-50" : "text-gray-700 hover:bg-gray-50"
              }`}>
                {uploading ? "Uploading..." : "Upload"}
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="About this organization"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 pb-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-navy)] hover:bg-[var(--brand-navy-light)] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
