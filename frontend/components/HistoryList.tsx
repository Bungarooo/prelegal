"use client";

import { useEffect, useState } from "react";
import type { HistoryEntry } from "@/lib/documents";

export default function HistoryList({
  username,
  onSelect,
}: {
  username: string;
  onSelect: (entry: HistoryEntry) => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/history?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((body: HistoryEntry[]) => {
        if (!cancelled) setEntries(body);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#032147]">Document History</h1>
      <p className="mt-1 text-sm text-[#888888]">Look back at documents you&apos;ve worked on.</p>

      {loadError && (
        <p className="mt-4 text-sm text-red-600">Could not load your document history.</p>
      )}

      {entries && entries.length === 0 && !loadError && (
        <p className="mt-6 text-sm text-neutral-500">
          You haven&apos;t started any documents yet. Pick one from the document picker to get
          going.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries?.map((entry) => (
          <button
            key={entry.slug}
            type="button"
            onClick={() => onSelect(entry)}
            className="flex flex-col items-start rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#209dd7]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#209dd7]/40"
          >
            <span className="font-medium text-[#032147]">{entry.name}</span>
            <span className="mt-1 text-xs text-[#888888]">Last updated {entry.updated_at}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
