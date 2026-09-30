"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { api, logout, token } from "@/lib/api";
import { useToast } from "@/components/ToastContext";
import type { Notification, Project } from "@/lib/types";

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const colors = ["bg-violet-500", "bg-indigo-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div className={`avatar ${color} text-white`} style={{ width: size * 4, height: size * 4, fontSize: size * 1.5 }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

const navItems = [
  { href: "board", label: "Issues", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )},
  { href: "sprints", label: "Cycles", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )},
  { href: "members", label: "Team", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )},
  { href: "activity", label: "Activity", icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )},
];

import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!token()) { router.replace("/login"); return; }
    try {
      const payload = JSON.parse(atob(token()!.split(".")[1]));
      setUsername(payload.username || "");
    } catch { /* ignore */ }
    api<Project>(`/projects/${slug}/`).then(setProject).catch(() => router.replace("/projects"));
    api<Notification[]>("/notifications/").then(setNotifs).catch(() => []);
  }, [slug, router]);

  const unread = notifs.filter((n) => !n.read_at).length;

  function signOut() { logout(); router.push("/login"); }

  async function markRead(id: number) {
    await api(`/notifications/${id}/read/`, { method: "POST" }).catch(() => null);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar (Dark Linear Style) ────────────────────────────── */}
      <aside className="w-[240px] shrink-0 bg-sidebar-bg text-sidebar-text flex flex-col h-full border-r border-sidebar-border">
        {/* Workspace Selector */}
        <div className="h-12 flex items-center px-4 border-b border-sidebar-border hover:bg-sidebar-hover cursor-pointer transition-colors group">
          <div className="w-5 h-5 bg-forge rounded-[4px] flex items-center justify-center text-white font-bold text-[10px] shadow-sm">⚡</div>
          <span className="ml-2.5 font-medium text-[13px] text-sidebar-active transition-colors">SprintForge</span>
          <svg className="w-3.5 h-3.5 ml-auto text-sidebar-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>
        </div>

        {/* Project Context */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[11px] font-semibold tracking-wider text-sidebar-text uppercase">Project</span>
          </div>
          <div className="flex items-center gap-2 text-sidebar-active font-medium text-[13px] px-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="truncate">{project?.name ?? "Loading..."}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-1 space-y-0.5">
          {navItems.map(({ href, label, icon }) => {
            const active = pathname.includes(`/${href}`);
            return (
              <Link
                key={href}
                href={`/projects/${slug}/${href}`}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  active 
                    ? "bg-sidebar-hover text-sidebar-active" 
                    : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-active"
                }`}
              >
                {icon}
                {label}
                {href === "members" && project && (
                  <span className="ml-auto text-[10px] font-mono bg-sidebar-border px-1.5 py-0.5 rounded text-sidebar-text">{project.member_count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Area */}
        <div className="px-3 py-3 border-t border-sidebar-border">
          <Link href="/projects" className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-active transition-colors mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            All projects
          </Link>
          <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-active transition-colors mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign out
          </button>
          {username && (
            <div className="flex items-center gap-2.5 px-3 pt-2 mt-1 border-t border-sidebar-border">
              <Avatar name={username} size={6} />
              <span className="text-[13px] font-medium text-sidebar-text truncate">{username}</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Top bar (Glassmorphism) */}
        <header className="h-12 glass-panel flex items-center justify-between px-6 sticky top-0 z-30 shadow-none border-b border-border">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink-muted">
            <Link href="/projects" className="hover:text-ink transition-colors">Projects</Link>
            <span className="text-border-strong">/</span>
            <span className="text-ink flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-forge text-white flex items-center justify-center font-bold text-[8px]">⚡</div>
              {project?.name ?? "..."}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-ink-subtle">
              <kbd className="kbd">C</kbd> <span className="text-[11px] font-medium">New Issue</span>
            </div>
            
            {/* Theme Switcher */}
            <ThemeSwitcher />
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs((v) => !v)}
                className="btn-icon text-ink-muted hover:text-ink relative hover:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute 1 top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-surface" />
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-10 w-80 modal-panel shadow-modal z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
                    <span className="font-semibold text-[13px] text-ink">Notifications</span>
                    {unread > 0 && <span className="badge-indigo bg-white">{unread} new</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-ink-muted">
                        <span className="text-2xl mb-2">✨</span>
                        <p className="text-sm font-medium">Inbox zero</p>
                      </div>
                    ) : (
                      notifs.map((n) => (
                        <div key={n.id} className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-gray-50 ${n.read_at ? "opacity-75" : "bg-[#5E6AD2]/5"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${n.read_at ? "bg-transparent border border-border-strong" : "bg-[#5E6AD2] shadow-[0_0_6px_rgba(94,106,210,0.5)]"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-snug ${n.read_at ? "text-ink-muted" : "text-ink font-medium"}`}>{n.message}</p>
                            <p className="text-[11px] text-ink-subtle mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                          </div>
                          {!n.read_at && (
                            <button onClick={() => markRead(n.id)} className="text-[11px] font-medium text-forge hover:text-forge-dark">Mark read</button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>

      {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
    </div>
  );
}
