"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, logout, token } from "@/lib/api";
import type { Project } from "@/lib/types";

function ProjectCard({ project }: { project: Project }) {
  const initials = project.name.slice(0, 2).toUpperCase();
  const colors = ["from-violet-500 to-indigo-500", "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500"];
  const gradient = colors[(project.name.charCodeAt(0) || 0) % colors.length];

  return (
    <a
      href={`/projects/${project.slug}/board`}
      className="card-hover flex flex-col group cursor-pointer transition-all duration-200"
    >
      {/* Gradient header */}
      <div className={`h-2 rounded-t-xl bg-forge`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg bg-forge text-white flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-ink truncate group-hover:text-forge transition-colors">{project.name}</h2>
            <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{project.description || "No description yet"}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {project.member_count} member{project.member_count !== 1 ? "s" : ""}
          </div>
          <span className="text-xs text-ink-muted">{new Date(project.created_at ?? "").toLocaleDateString()}</span>
        </div>
      </div>
    </a>
  );
}

import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!token()) { router.replace("/login"); return; }
    try {
      const payload = JSON.parse(atob(token()!.split(".")[1]));
      setUsername(payload.username || "");
    } catch { /* ignore */ }
    api<Project[]>("/projects/")
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const project = await api<Project>("/projects/", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      router.push(`/projects/${project.slug}/board`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation */}
      <header className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-forge rounded-lg flex items-center justify-center text-white font-bold text-sm">⚡</div>
            <span className="font-bold text-ink">SprintForge</span>
          </div>
          <div className="flex items-center gap-4">
            {username && (
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <div className="w-7 h-7 rounded-full bg-forge flex items-center justify-center text-white text-xs font-bold">
                  {username[0]?.toUpperCase()}
                </div>
                <span className="hidden sm:inline">{username}</span>
              </div>
            )}
            <ThemeSwitcher />
            <button onClick={() => { logout(); router.push("/login"); }} className="btn-secondary btn-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ink">Your projects</h1>
            <p className="text-sm text-ink-muted mt-0.5">Manage and collaborate on your team's work</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            New project
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Projects grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map((i) => (
              <div key={i} className="card">
                <div className="h-2 skeleton rounded-t-xl" />
                <div className="p-5 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 skeleton rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 skeleton rounded w-3/4" />
                      <div className="h-3 skeleton rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-px skeleton" />
                  <div className="h-3 skeleton rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center text-3xl mb-4">🚀</div>
            <h3 className="font-semibold text-ink text-lg">No projects yet</h3>
            <p className="text-ink-muted text-sm mt-1 mb-6">Create your first project to start tracking work</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">Create your first project</button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      {/* New project modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-ink">New project</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon btn-ghost text-ink-muted">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              <div>
                <label className="label" htmlFor="proj-name">Project name</label>
                <input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className="input" placeholder="e.g. Website Redesign" />
              </div>
              <div>
                <label className="label" htmlFor="proj-desc">Description <span className="normal-case font-normal text-ink-muted">(optional)</span></label>
                <textarea id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="What is this project about?" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1 justify-center">
                  {creating ? "Creating…" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
