# Mutual NDA Creator

A prototype Next.js app for PL-3: enter the key terms of a [Common Paper Mutual
NDA](https://commonpaper.com/standards/mutual-nda/1.0) (purpose, effective
date, term, governing law, and each party's info) and see the completed
agreement rendered live. Download the result as Markdown, or use "Download
PDF" to print/save it as a PDF via the browser's print dialog.

The Standard Terms text is Common Paper's Mutual NDA Standard Terms Version
1.0, free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm run test        # run the unit test suite once
npm run test:watch  # re-run on change
```

Unit tests cover `lib/nda.ts` — the document-generation logic (term/date
formatting, placeholder fallbacks, Markdown table escaping, filename
sanitization) — since that's where the legal text is actually assembled.

## Structure

- `lib/nda.ts` — NDA data model and the Standard Terms/Cover Page text, with
  helpers to fill in the entered values and generate the downloadable Markdown.
- `lib/nda.test.ts` — unit tests for the above.
- `components/NdaForm.tsx` — the input form.
- `components/NdaPreview.tsx` — the live, filled-in document preview.
- `app/page.tsx` — wires the form and preview together and handles downloads.
