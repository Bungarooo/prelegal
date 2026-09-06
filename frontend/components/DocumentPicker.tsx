"use client";

import { useEffect, useState } from "react";
import type { DocumentSummary, RouteResult } from "@/lib/documents";

export default function DocumentPicker({
  onSelect,
}: {
  onSelect: (slug: string, name: string) => void;
}) {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [message, setMessage] = useState("");
  const [routing, setRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/documents")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((body: DocumentSummary[]) => {
        if (!cancelled) setDocuments(body);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAskSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = message.trim();
    if (!content || routing) return;

    setRouting(true);
    setRouteError(null);
    setRouteResult(null);
    try {
      const response = await fetch("/api/documents/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      if (!response.ok) {
        setRouteError("Something went wrong. Please try again.");
        return;
      }
      const body: RouteResult = await response.json();
      setRouteResult(body);
    } catch {
      setRouteError("Could not reach the server. Please try again.");
    } finally {
      setRouting(false);
    }
  }

  function suggestedName(): string {
    if (!routeResult) return "";
    return (
      documents?.find((d) => d.slug === routeResult.suggested_slug)?.name ??
      routeResult.suggested_slug
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#032147]">
        What do you need to draft?
      </h1>
      <p className="mt-1 text-sm text-[#888888]">
        Pick a document below, or tell us what you&apos;re trying to do.
      </p>

      <form onSubmit={handleAskSubmit} className="mt-6 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. I need something for hiring a contractor"
          aria-label="Describe the document you need"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#209dd7]/40"
        />
        <button
          type="submit"
          disabled={routing || !message.trim()}
          className="shrink-0 rounded-lg bg-[#753991] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#753991]/40 disabled:opacity-60"
        >
          {routing ? "Thinking…" : "Ask"}
        </button>
      </form>

      {routeError && <p className="mt-2 text-sm text-red-600">{routeError}</p>}

      {routeResult && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-800">{routeResult.reply}</p>
          <button
            type="button"
            onClick={() => onSelect(routeResult.suggested_slug, suggestedName())}
            className="mt-3 rounded-lg bg-[#209dd7] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90"
          >
            Start {suggestedName()}
          </button>
        </div>
      )}

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-[#888888]">
        Supported documents
      </h2>

      {loadError && <p className="mt-3 text-sm text-red-600">Could not load the document catalog.</p>}

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents?.map((doc) => (
          <button
            key={doc.slug}
            type="button"
            onClick={() => onSelect(doc.slug, doc.name)}
            className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#209dd7]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#209dd7]/40"
          >
            <span className="font-medium text-[#032147]">{doc.name}</span>
            <span className="mt-1 text-xs text-[#888888]">{doc.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
