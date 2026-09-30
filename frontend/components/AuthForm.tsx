"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setTokens } from "@/lib/api";

export function AuthForm({ register = false }: { register?: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      if (register) {
        await api("/auth/register/", {
          method: "POST",
          body: JSON.stringify({ username: form.get("username"), email: form.get("email"), password: form.get("password") }),
        });
      }
      const data = await api<{ access: string; refresh: string }>("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      setTokens(data.access, data.refresh);
      router.push("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-forge rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-forge-light rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-forge rounded-xl flex items-center justify-center text-white font-bold text-lg">⚡</div>
            <span className="text-white font-bold text-xl tracking-tight">SprintForge</span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight text-balance">
            Ship faster,<br />together.
          </h2>
          <p className="mt-4 text-ink-subtle text-lg leading-relaxed">
            Plan sprints, track issues, and collaborate in real-time with your engineering team.
          </p>
        </div>
        <div className="relative z-10 space-y-4">
          {[
            { icon: "🎯", text: "Kanban boards with live updates" },
            { icon: "🔒", text: "Role-based access control" },
            { icon: "📊", text: "Sprint analytics & burndown" },
            { icon: "💬", text: "Task comments & attachments" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 text-ink-subtle">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-forge rounded-lg flex items-center justify-center text-white font-bold">⚡</div>
            <span className="font-bold text-lg">SprintForge</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-ink">
              {register ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {register
                ? "Start collaborating with your team in minutes."
                : "Sign in to continue to your workspace."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input id="username" name="username" required className="input" placeholder="your_username" autoComplete="username" />
            </div>

            {register && (
              <div>
                <label className="label" htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" required className="input" placeholder="you@company.com" autoComplete="email" />
              </div>
            )}

            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required minLength={8} className="input" placeholder="••••••••" autoComplete={register ? "new-password" : "current-password"} />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 animate-fade-in">
                <span className="shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {register ? "Creating account…" : "Signing in…"}
                </span>
              ) : register ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            {register ? "Already have an account?" : "Don't have an account?"}{" "}
            <a href={register ? "/login" : "/register"} className="font-semibold text-forge hover:text-forge-dark transition-colors">
              {register ? "Sign in" : "Sign up for free"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

