"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Sprint } from "@/lib/types";

function SprintStatusBadge({ sprint }: { sprint: Sprint }) {
  if (sprint.active) return <span className="badge-green">Active</span>;
  const now = new Date();
  const end = sprint.end_date ? new Date(sprint.end_date) : null;
  if (end && end < now) return <span className="badge-slate">Completed</span>;
  return <span className="badge-blue">Planned</span>;
}

export default function SprintsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });

  function load() {
    return api<Sprint[]>(`/projects/${slug}/sprints/`)
      .then(setSprints)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [slug]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api(`/projects/${slug}/sprints/`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          goal: form.goal,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        }),
      });
      setShowForm(false);
      setForm({ name: "", goal: "", start_date: "", end_date: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create sprint");
    } finally {
      setCreating(false);
    }
  }

  const active = sprints.find((s) => s.active);
  const others = sprints.filter((s) => !s.active);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sprints</h1>
          <p className="text-sm text-muted mt-0.5">Plan and track your team's iterations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary btn-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
          New sprint
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">⚠ {error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1,2].map((i) => <div key={i} className="card p-5 h-24 skeleton" />)}
        </div>
      ) : sprints.length === 0 ? (
        <div className="empty-state">
          <span className="text-4xl mb-3">⚡</span>
          <h3 className="font-semibold text-slate-900">No sprints yet</h3>
          <p className="text-muted text-sm mt-1 mb-5">Create your first sprint to start tracking iterations</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create first sprint</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active sprint */}
          {active && (
            <div>
              <p className="section-title mb-2">Current sprint</p>
              <SprintCard sprint={active} />
            </div>
          )}

          {/* Other sprints */}
          {others.length > 0 && (
            <div>
              <p className="section-title mb-2 mt-6">All sprints</p>
              <div className="card divide-y divide-border">
                {others.map((s) => <SprintRow key={s.id} sprint={s} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-slate-900">New sprint</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon btn-ghost text-muted">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              <div>
                <label className="label" htmlFor="sprint-name">Sprint name</label>
                <input id="sprint-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="e.g. Sprint 1" />
              </div>
              <div>
                <label className="label" htmlFor="sprint-goal">Goal <span className="normal-case font-normal text-muted">(optional)</span></label>
                <textarea id="sprint-goal" rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} className="input resize-none" placeholder="What will this sprint achieve?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="sprint-start">Start date</label>
                  <input id="sprint-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="sprint-end">End date</label>
                  <input id="sprint-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input" />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1 justify-center">
                  {creating ? "Creating…" : "Create sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SprintCard({ sprint }: { sprint: Sprint }) {
  const start = sprint.start_date ? new Date(sprint.start_date) : null;
  const end = sprint.end_date ? new Date(sprint.end_date) : null;
  const days = start && end ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const daysSoFar = start ? Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const progress = days && daysSoFar ? Math.min(100, Math.max(0, Math.round((daysSoFar / days) * 100))) : null;

  return (
    <div className="card p-5 border-l-4 border-l-emerald-500">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-green">Active</span>
          </div>
          <h3 className="font-semibold text-slate-900">{sprint.name}</h3>
          {sprint.goal && <p className="text-sm text-muted mt-1">{sprint.goal}</p>}
        </div>
        {start && end && (
          <div className="text-right text-xs text-muted shrink-0">
            <p>{start.toLocaleDateString()} –</p>
            <p>{end.toLocaleDateString()}</p>
          </div>
        )}
      </div>
      {progress !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Time elapsed</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function SprintRow({ sprint }: { sprint: Sprint }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-900">{sprint.name}</p>
        {sprint.goal && <p className="text-xs text-muted truncate mt-0.5">{sprint.goal}</p>}
      </div>
      <div className="text-xs text-muted hidden sm:block">
        {sprint.start_date && sprint.end_date
          ? `${new Date(sprint.start_date).toLocaleDateString()} → ${new Date(sprint.end_date).toLocaleDateString()}`
          : "No dates set"}
      </div>
      <SprintStatusBadge sprint={sprint} />
    </div>
  );
}
