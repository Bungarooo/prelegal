"use client";

import { useState } from "react";
import DocumentChat from "@/components/DocumentChat";
import DocumentPicker from "@/components/DocumentPicker";
import DocumentPreview from "@/components/DocumentPreview";
import LoginScreen from "@/components/LoginScreen";
import NdaChat from "@/components/NdaChat";
import NdaPreview from "@/components/NdaPreview";
import { suggestedGenericFilename, type GenericFields } from "@/lib/documents";
import { defaultNdaFormData, generateMarkdown, suggestedFilename } from "@/lib/nda";

const SESSION_STORAGE_KEY = "prelegal_username";
const NDA_SLUG = "mutual-nda";

export default function Home() {
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  });
  const [selected, setSelected] = useState<{ slug: string; name: string } | null>(null);
  const [data, setData] = useState(defaultNdaFormData);
  const [genericFields, setGenericFields] = useState<GenericFields>({});
  const [genericMarkdown, setGenericMarkdown] = useState("");

  function handleLogin(loggedInUsername: string) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, loggedInUsername);
    setUsername(loggedInUsername);
  }

  function handleSignOut() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUsername(null);
    setSelected(null);
  }

  async function handleSelectDocument(slug: string, name: string) {
    setData(defaultNdaFormData());
    setGenericFields({});
    setGenericMarkdown("");
    setSelected({ slug, name });

    if (slug === NDA_SLUG) return;
    try {
      const response = await fetch(`/api/documents/${slug}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: {} }),
      });
      if (!response.ok) return;
      const body: { markdown: string } = await response.json();
      setGenericMarkdown(body.markdown);
    } catch {
      // Leave the preview blank; DocumentChat will populate it once the user sends a message.
    }
  }

  if (!username) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!selected) {
    return <DocumentPicker onSelect={handleSelectDocument} />;
  }

  const isNda = selected.slug === NDA_SLUG;

  function downloadMarkdown() {
    const markdown = isNda ? generateMarkdown(data) : genericMarkdown;
    const filename = isNda ? suggestedFilename(data) : suggestedGenericFilename(selected!.name);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white/80 px-6 py-4 backdrop-blur print:hidden">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
            {isNda ? "Mutual NDA Creator" : selected.name}
          </h1>
          <p className="text-sm text-neutral-500">
            Chat with the assistant and your document is generated live below.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            Change Document
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[440px_1fr]">
        <section aria-label="Document chat assistant" className="print:hidden">
          <div className="sticky top-24 space-y-5">
            {isNda ? (
              <NdaChat data={data} onChange={setData} />
            ) : (
              <DocumentChat
                key={selected.slug}
                slug={selected.slug}
                name={selected.name}
                fields={genericFields}
                onChange={(fields, markdown) => {
                  setGenericFields(fields);
                  setGenericMarkdown(markdown);
                }}
              />
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <DownloadIcon />
                Download PDF
              </button>
              <button
                type="button"
                onClick={downloadMarkdown}
                disabled={!isNda && !genericMarkdown}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60"
              >
                <DownloadIcon />
                Download Markdown
              </button>
            </div>
          </div>
        </section>

        <section aria-label="Document preview" id="nda-preview" className="print:m-0">
          {isNda ? (
            <NdaPreview data={data} />
          ) : genericMarkdown ? (
            <DocumentPreview markdown={genericMarkdown} />
          ) : (
            <p className="text-center text-sm text-neutral-500">
              Start chatting to generate a preview of your {selected.name}.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={1.8} stroke="currentColor">
      <path d="M12 4v11" strokeLinecap="round" />
      <path d="M7.5 11.5 12 16l4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19.5h14" strokeLinecap="round" />
    </svg>
  );
}
