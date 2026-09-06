"use client";

import { useState } from "react";

export default function LoginScreen({ onLogin }: { onLogin: (username: string) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.detail ?? "Something went wrong. Please try again.");
        return;
      }
      onLogin(body.username);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#032147]">
            {mode === "login" ? "Log in to Prelegal" : "Create your Prelegal account"}
          </h1>
          <p className="mt-1 text-sm text-[#888888]">
            Draft and manage your legal agreements.
          </p>
        </div>

        <label className="block text-sm font-medium text-[#032147]">
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/40"
          />
        </label>

        <label className="block text-sm font-medium text-[#032147]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/40"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#753991] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#753991]/40 disabled:opacity-60"
        >
          {mode === "login" ? "Log In" : "Create Account"}
        </button>

        <p className="text-center text-sm text-[#888888]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-[#209dd7] hover:underline"
          >
            {mode === "login" ? "Create one" : "Log in"}
          </button>
        </p>
      </form>
    </div>
  );
}
