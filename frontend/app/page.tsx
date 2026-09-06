"use client";

import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import DocumentChat from "@/components/DocumentChat";
import DocumentPicker from "@/components/DocumentPicker";
import DocumentPreview from "@/components/DocumentPreview";
import HistoryList from "@/components/HistoryList";
import LoginScreen from "@/components/LoginScreen";
import NdaChat from "@/components/NdaChat";
import NdaPreview from "@/components/NdaPreview";
import { suggestedGenericFilename, type GenericFields, type HistoryEntry } from "@/lib/documents";
import { defaultNdaFormData, generateMarkdown, suggestedFilename, type NdaFormData } from "@/lib/nda";

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
  const [historyView, setHistoryView] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null);

  function handleLogin(loggedInUsername: string) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, loggedInUsername);
    setUsername(loggedInUsername);
  }

  function handleSignOut() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setUsername(null);
    setSelected(null);
  }

  function handleShowHistory() {
    setHistoryView(true);
    setHistoryEntry(null);
  }

  function handleBackToPicker() {
    setSelected(null);
    setHistoryView(false);
    setHistoryEntry(null);
  }

  async function handleSelectDocument(slug: string, name: string) {
    setData(defaultNdaFormData());
    setGenericFields({});
    setGenericMarkdown("");
    setHistoryView(false);
    setHistoryEntry(null);
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

  if (historyView) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
        <AppHeader
          title="Document History"
          subtitle="Look back at documents you've worked on."
          showChangeDocument
          onChangeDocument={handleBackToPicker}
          onHistory={handleShowHistory}
          onSignOut={handleSignOut}
        />
        <DisclaimerBanner />
        {historyEntry ? (
          <main className="mx-auto max-w-[720px] px-6 py-8">
            <button
              type="button"
              onClick={() => setHistoryEntry(null)}
              className="mb-4 text-sm font-medium text-[#209dd7] hover:underline"
            >
              ← Back to history
            </button>
            {historyEntry.slug === NDA_SLUG ? (
              <NdaPreview data={historyEntry.fields as unknown as NdaFormData} />
            ) : (
              <DocumentPreview markdown={historyEntry.markdown} />
            )}
          </main>
        ) : (
          <HistoryList username={username} onSelect={setHistoryEntry} />
        )}
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
        <AppHeader
          title="Prelegal"
          subtitle="Draft and manage your legal agreements."
          showChangeDocument={false}
          onChangeDocument={handleBackToPicker}
          onHistory={handleShowHistory}
          onSignOut={handleSignOut}
        />
        <DisclaimerBanner />
        <DocumentPicker onSelect={handleSelectDocument} />
      </div>
    );
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
      <AppHeader
        title={isNda ? "Mutual NDA Creator" : selected.name}
        subtitle="Chat with the assistant and your document is generated live below."
        showChangeDocument
        onChangeDocument={handleBackToPicker}
        onHistory={handleShowHistory}
        onSignOut={handleSignOut}
      />
      <DisclaimerBanner />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[440px_1fr]">
        <section aria-label="Document chat assistant" className="print:hidden">
          <div className="sticky top-24 space-y-5">
            {isNda ? (
              <NdaChat username={username} data={data} onChange={setData} />
            ) : (
              <DocumentChat
                key={selected.slug}
                username={username}
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#753991] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#753991]/40"
              >
                <DownloadIcon />
                Download PDF
              </button>
              <button
                type="button"
                onClick={downloadMarkdown}
                disabled={!isNda && !genericMarkdown}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30 disabled:opacity-60"
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
