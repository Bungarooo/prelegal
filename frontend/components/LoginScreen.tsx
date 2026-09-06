"use client";

import { useState } from "react";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onLogin();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#032147]">
            Log in to Prelegal
          </h1>
          <p className="mt-1 text-sm text-[#888888]">
            Draft and manage your legal agreements.
          </p>
        </div>

        <label className="block text-sm font-medium text-[#032147]">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <button
          type="submit"
          className="w-full rounded-lg bg-[#753991] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#753991]/40"
        >
          Log In
        </button>
      </form>
    </div>
  );
}
