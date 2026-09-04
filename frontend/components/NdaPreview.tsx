import {
  confidentialityTermText,
  formatDate,
  mndaTermText,
  standardTermsParagraphs,
  type NdaFormData,
} from "@/lib/nda";

function display(value: string, placeholder: string): { text: string; empty: boolean } {
  const trimmed = value.trim();
  return trimmed ? { text: trimmed, empty: false } : { text: placeholder, empty: true };
}

function Field({ value, placeholder }: { value: string; placeholder: string }) {
  const { text, empty } = display(value, placeholder);
  return <span className={empty ? "text-black/35 italic" : undefined}>{text}</span>;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function NdaPreview({ data }: { data: NdaFormData }) {
  const p1 = data.party1;
  const p2 = data.party2;

  return (
    <article className="mx-auto max-w-[720px] bg-white p-8 text-[13px] leading-relaxed text-black shadow-sm print:shadow-none sm:p-10">
      <h1 className="text-center text-xl font-bold">Mutual Non-Disclosure Agreement</h1>

      <p className="mt-4 text-black/80">
        This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;) consists of this Cover
        Page and the Common Paper Mutual NDA Standard Terms Version 1.0, identical to those
        posted at commonpaper.com/standards/mutual-nda/1.0. Any modifications of the Standard
        Terms are set out below and control over conflicts with the Standard Terms.
      </p>

      <h2 className="mt-6 text-base font-semibold">Cover Page</h2>

      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Purpose
          </dt>
          <dd>
            <Field value={data.purpose} placeholder="[Purpose not specified]" />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Effective Date
          </dt>
          <dd>{formatDate(data.effectiveDate)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">
            MNDA Term
          </dt>
          <dd>{mndaTermText(data)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Term of Confidentiality
          </dt>
          <dd>{confidentialityTermText(data)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">
            Governing Law &amp; Jurisdiction
          </dt>
          <dd>
            Governing Law: <Field value={data.governingLaw} placeholder="[Governing Law]" />
            <br />
            Jurisdiction: <Field value={data.jurisdiction} placeholder="[Jurisdiction]" />
          </dd>
        </div>
        {data.modifications.trim() && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">
              MNDA Modifications
            </dt>
            <dd>{data.modifications}</dd>
          </div>
        )}
      </dl>

      <p className="mt-4 text-black/80">
        By signing this Cover Page, each party agrees to enter into this MNDA as of the
        Effective Date.
      </p>

      <table className="mt-3 w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border border-black/15 p-2"></th>
            <th className="border border-black/15 p-2 font-semibold">Party 1</th>
            <th className="border border-black/15 p-2 font-semibold">Party 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="border border-black/15 p-2 font-normal text-black/60">Print Name</th>
            <td className="border border-black/15 p-2">
              <Field value={p1.name} placeholder="—" />
            </td>
            <td className="border border-black/15 p-2">
              <Field value={p2.name} placeholder="—" />
            </td>
          </tr>
          <tr>
            <th className="border border-black/15 p-2 font-normal text-black/60">Title</th>
            <td className="border border-black/15 p-2">
              <Field value={p1.title} placeholder="—" />
            </td>
            <td className="border border-black/15 p-2">
              <Field value={p2.title} placeholder="—" />
            </td>
          </tr>
          <tr>
            <th className="border border-black/15 p-2 font-normal text-black/60">Company</th>
            <td className="border border-black/15 p-2">
              <Field value={p1.company} placeholder="—" />
            </td>
            <td className="border border-black/15 p-2">
              <Field value={p2.company} placeholder="—" />
            </td>
          </tr>
          <tr>
            <th className="border border-black/15 p-2 font-normal text-black/60">
              Notice Address
            </th>
            <td className="border border-black/15 p-2">
              <Field value={p1.noticeAddress} placeholder="—" />
            </td>
            <td className="border border-black/15 p-2">
              <Field value={p2.noticeAddress} placeholder="—" />
            </td>
          </tr>
          <tr>
            <th className="border border-black/15 p-2 font-normal text-black/60">Signature</th>
            <td className="border border-black/15 p-2">&nbsp;</td>
            <td className="border border-black/15 p-2">&nbsp;</td>
          </tr>
          <tr>
            <th className="border border-black/15 p-2 font-normal text-black/60">Date</th>
            <td className="border border-black/15 p-2">&nbsp;</td>
            <td className="border border-black/15 p-2">&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-8 text-base font-semibold">Standard Terms</h2>
      <div className="mt-3 space-y-3 text-justify">
        {standardTermsParagraphs(data).map((paragraph, i) => (
          <p key={i}>{renderInline(paragraph)}</p>
        ))}
      </div>

      <p className="mt-6 text-xs text-black/50">
        Common Paper Mutual Non-Disclosure Agreement (Version 1.0), incorporated by reference,
        free to use under CC BY 4.0.
      </p>
    </article>
  );
}
