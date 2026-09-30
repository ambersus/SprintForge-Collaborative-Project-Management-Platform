"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Membership, User } from "@/lib/types";

const ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
const ROLE_LABELS: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member", VIEWER: "Viewer" };
const ROLE_COLORS: Record<string, string> = { OWNER: "badge-purple", ADMIN: "badge-indigo", MEMBER: "badge-green", VIEWER: "badge-slate" };

function Avatar({ name }: { name: string }) {
  const colors = ["bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return <div className={`avatar ${color} text-sm`} style={{ width: 36, height: 36, fontSize: 14 }}>{name[0]?.toUpperCase()}</div>;
}

export default function MembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const [members, setMembers] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  function load() {
    return api<Membership[]>(`/projects/${slug}/members/`)
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [slug]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setAdding(true);
    setError("");
    try {
      await api(`/projects/${slug}/members/`, { method: "POST", body: JSON.stringify({ user_id: Number(userId), role }) });
      setShowAdd(false);
      setUserId("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add member");
    } finally {
      setAdding(false);
    }
  }

  const filtered = members.filter((m) =>
    m.user.username.toLowerCase().includes(search.toLowerCase()) ||
    m.user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team members</h1>
          <p className="text-sm text-muted mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""} in this project</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
          Add member
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 animate-fade-in">⚠ {error}</div>}

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search members…" />
      </div>

      {/* Members list */}
      <div className="card divide-y divide-border">
        {loading ? (
          [1,2,3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 skeleton rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 skeleton rounded w-32" />
                <div className="h-3 skeleton rounded w-48" />
              </div>
              <div className="h-5 w-16 skeleton rounded-md" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="empty-state py-12">
            <span className="text-3xl mb-3">👥</span>
            <p className="text-muted text-sm">{search ? "No members match your search" : "No members yet"}</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              <Avatar name={m.user.username} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{m.user.username}</p>
                <p className="text-xs text-muted truncate">{m.user.email || "No email"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</span>
                <span className="text-xs text-muted hidden sm:inline">{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add member modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-slate-900">Add team member</h2>
              <button onClick={() => setShowAdd(false)} className="btn-icon btn-ghost text-muted">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={addMember} className="p-6 space-y-4">
              <div>
                <label className="label" htmlFor="add-user-id">User ID</label>
                <input
                  id="add-user-id"
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="input"
                  placeholder="Enter the user's numeric ID"
                />
                <p className="text-xs text-muted mt-1">Ask your team member to share their user ID from their profile.</p>
              </div>
              <div>
                <label className="label" htmlFor="add-role">Role</label>
                <select id="add-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="input">
                  <option value="ADMIN">Admin — manage members and sprints</option>
                  <option value="MEMBER">Member — create and edit tasks</option>
                  <option value="VIEWER">Viewer — read only</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={adding} className="btn-primary flex-1 justify-center">
                  {adding ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
