"use client";

import { useState } from "react";
import NdaForm from "@/components/NdaForm";
import NdaPreview from "@/components/NdaPreview";
import { defaultNdaFormData, generateMarkdown, suggestedFilename } from "@/lib/nda";

export default function Home() {
  const [data, setData] = useState(defaultNdaFormData);

  function downloadMarkdown() {
    const blob = new Blob([generateMarkdown(data)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedFilename(data);
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
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 px-6 py-4 backdrop-blur print:hidden">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
          Mutual NDA Creator
        </h1>
        <p className="text-sm text-neutral-500">
          Fill in the form and your Mutual Non-Disclosure Agreement is generated live below.
        </p>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[440px_1fr]">
        <section aria-label="NDA details form" className="print:hidden">
          <div className="sticky top-24 space-y-5">
            <NdaForm data={data} onChange={setData} />
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
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <DownloadIcon />
                Download Markdown
              </button>
            </div>
          </div>
        </section>

        <section aria-label="NDA preview" id="nda-preview" className="print:m-0">
          <NdaPreview data={data} />
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
