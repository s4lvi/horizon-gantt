"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { KeyRound, Copy, Check, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createApiToken, deleteApiToken } from "@/lib/actions/token-actions";

type TokenRow = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
};

export function ApiTokens({ initialTokens }: { initialTokens: TokenRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mcpUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/mcp`
      : "/api/mcp";

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await createApiToken(name);
      setTokens((prev) => [
        { id: created.id, name: created.name, created_at: created.created_at, last_used_at: null },
        ...prev,
      ]);
      setFreshToken(created.token);
      setCopied(false);
      setNewName("");
    } catch {
      toast.error("Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteApiToken(id);
    } catch {
      toast.error("Failed to delete token");
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-[var(--brand-navy)]" />
        <h2 className="text-lg font-semibold text-gray-800">API Tokens</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Tokens authenticate the MCP server at{" "}
        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{mcpUrl}</code>,
        letting AI assistants like Claude read and update your charts. A token has
        the same permissions as your account — treat it like a password.
      </p>

      {/* Create */}
      <div className="flex items-center gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="Token name (e.g. Claude Code)"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[var(--brand-navy)] focus:border-transparent outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-[var(--brand-navy)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Plus size={16} />
          Create
        </button>
      </div>

      {/* Freshly created token — shown once */}
      {freshToken && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
          <p className="text-xs font-medium text-amber-800 mb-2">
            Copy this token now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-amber-200 rounded px-2 py-1.5 break-all">
              {freshToken}
            </code>
            <button
              onClick={() => handleCopy(freshToken)}
              className="p-1.5 text-amber-700 hover:bg-amber-100 rounded flex-shrink-0"
              title="Copy token"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-xs text-amber-700 mt-2">
            Claude Code:{" "}
            <code className="bg-white border border-amber-200 rounded px-1 py-0.5 break-all">
              claude mcp add --transport http horizon-gantt {mcpUrl} --header
              &quot;Authorization: Bearer {"<token>"}&quot;
            </code>
          </p>
        </div>
      )}

      {/* Token list */}
      {tokens.length > 0 ? (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {t.name}
                </div>
                <div className="text-xs text-gray-400">
                  Created {format(parseISO(t.created_at), "MMM d, yyyy")}
                  {t.last_used_at &&
                    ` · Last used ${format(parseISO(t.last_used_at), "MMM d, yyyy")}`}
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                title="Revoke token"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">
          No API tokens yet.
        </p>
      )}
    </section>
  );
}
