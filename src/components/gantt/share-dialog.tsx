"use client";

import { useState, useEffect } from "react";
import {
  shareChart,
  removeShare,
  getChartShares,
  createShareLink,
  getShareLinks,
  deleteShareLink,
} from "@/lib/actions/share-actions";
import { SharePermission } from "@/lib/types";
import { X, UserPlus, Trash2, Link, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function ShareDialog({
  chartId,
  isOwner,
}: {
  chartId: string;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<SharePermission>("view");
  const [linkPermission, setLinkPermission] = useState<SharePermission>("view");
  const [shares, setShares] = useState<any[]>([]);
  const [shareLinks, setShareLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener("toggle-share-dialog", handler);
    return () => window.removeEventListener("toggle-share-dialog", handler);
  }, []);

  useEffect(() => {
    if (open && isOwner) {
      getChartShares(chartId).then(setShares).catch(() => {});
      getShareLinks(chartId).then(setShareLinks).catch(() => {});
    }
  }, [open, chartId, isOwner]);

  if (!open || !isOwner) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await shareChart(chartId, email.trim(), permission);
      const updated = await getChartShares(chartId);
      setShares(updated);
      setEmail("");
      toast.success("Chart shared successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to share chart");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    try {
      const link = await createShareLink(chartId, linkPermission);
      setShareLinks((prev) => [link, ...prev]);
      toast.success("Share link created");
    } catch {
      toast.error("Failed to create share link");
    }
  };

  const handleCopyLink = (token: string, linkId: string) => {
    const url = `${window.location.origin}/invite/chart/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(linkId);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteShareLink(linkId, chartId);
      setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
      toast.success("Link removed");
    } catch {
      toast.error("Failed to remove link");
    }
  };

  const handleRemove = async (shareId: string) => {
    try {
      await removeShare(shareId, chartId);
      setShares(shares.filter((s) => s.id !== shareId));
      toast.success("Share removed");
    } catch {
      toast.error("Failed to remove share");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
          <h2 className="font-semibold text-gray-900">Share Chart</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Share by email */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Share by email
          </p>
          <form onSubmit={handleShare} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <select
              value={permission}
              onChange={(e) =>
                setPermission(e.target.value as SharePermission)
              }
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <UserPlus size={16} />
            </button>
          </form>
        </div>

        {/* Share by link */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Share via link
          </p>
          <div className="flex gap-2">
            <select
              value={linkPermission}
              onChange={(e) =>
                setLinkPermission(e.target.value as SharePermission)
              }
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="view">Anyone with link can view</option>
              <option value="edit">Anyone with link can edit</option>
            </select>
            <button
              onClick={handleCreateLink}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Link size={14} />
              Create
            </button>
          </div>

          {shareLinks.length > 0 && (
            <div className="mt-3 space-y-2">
              {shareLinks.map((link: any) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate font-mono">
                      /invite/chart/{link.token.slice(0, 12)}...
                    </p>
                    <p className="text-xs text-gray-400">
                      {link.permission === "edit" ? "Can edit" : "Can view"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleCopyLink(link.token, link.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                    >
                      {copiedId === link.id ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing shares */}
        {shares.length > 0 && (
          <div className="p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shared with
            </p>
            {shares.map((share: any) => (
              <div
                key={share.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {share.profiles?.full_name || share.profiles?.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {share.permission === "edit" ? "Can edit" : "Can view"}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(share.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
