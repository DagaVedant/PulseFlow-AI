"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { api } from "@/lib/api";
import { setAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await api.login(username, password);
      setAuth(result.access_token, result.role);
      router.push("/command-center");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinical-canvas px-4">
      <div className="w-full max-w-sm border border-clinical-border bg-clinical-surface rounded-lg p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo-full.png"
            alt="PulseFlow AI"
            className="w-full object-contain"
          />
          <div className="flex items-center gap-2 text-muted">
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Sign in
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-sm text-muted font-medium block"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full min-h-11 px-3 rounded-lg border border-clinical-border bg-clinical-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm text-muted font-medium block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-11 px-3 rounded-lg border border-clinical-border bg-clinical-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-crit-line bg-crit-soft text-crit-ink text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold border border-clinical-border bg-clinical-canvas text-ink hover:bg-elevated transition-colors disabled:opacity-40"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
