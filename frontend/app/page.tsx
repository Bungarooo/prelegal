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
    <div className="min-h-screen bg-black/[.02]">
      <header className="border-b border-black/10 bg-white px-6 py-4 print:hidden">
        <h1 className="text-lg font-semibold text-black">Mutual NDA Creator</h1>
        <p className="text-sm text-black/60">
          Fill in the form and your Mutual Non-Disclosure Agreement is generated live below.
        </p>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[420px_1fr]">
        <section aria-label="NDA details form" className="print:hidden">
          <div className="sticky top-8 space-y-4">
            <NdaForm data={data} onChange={setData} />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={downloadPdf}
                className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={downloadMarkdown}
                className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
              >
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
