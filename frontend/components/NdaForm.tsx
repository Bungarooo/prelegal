"use client";

import { positiveYears, type NdaFormData, type PartyInfo } from "@/lib/nda";

type PartyKey = "party1" | "party2";

export default function NdaForm({
  data,
  onChange,
}: {
  data: NdaFormData;
  onChange: (data: NdaFormData) => void;
}) {
  function set<K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) {
    onChange({ ...data, [key]: value });
  }

  function setPositiveYears(key: "mndaTermYears" | "confidentialityTermYears", raw: string) {
    set(key, positiveYears(Number(raw)));
  }

  function setParty(partyKey: PartyKey, field: keyof PartyInfo, value: string) {
    onChange({
      ...data,
      [partyKey]: { ...data[partyKey], [field]: value },
    });
  }

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <SectionCard
        icon={<DocumentIcon />}
        title="Agreement details"
        description="These terms appear on the Cover Page."
      >
        <Field label="Purpose" hint="How Confidential Information may be used">
          <textarea
            className={textareaClass}
            rows={2}
            value={data.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </Field>

        <Field label="Effective Date">
          <input
            type="date"
            className={inputClass}
            value={data.effectiveDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </Field>

        <Field label="MNDA Term" hint="The length of this MNDA">
          <div className="space-y-2">
            <RadioCard
              name="mndaTermType"
              checked={data.mndaTermType === "expires"}
              onSelect={() => set("mndaTermType", "expires")}
            >
              <span className="inline-flex flex-wrap items-center gap-2">
                Expires
                <input
                  type="number"
                  min={1}
                  className={numberInlineClass}
                  value={data.mndaTermYears}
                  onFocus={() => set("mndaTermType", "expires")}
                  onChange={(e) => setPositiveYears("mndaTermYears", e.target.value)}
                />
                year(s) from Effective Date.
              </span>
            </RadioCard>
            <RadioCard
              name="mndaTermType"
              checked={data.mndaTermType === "continues"}
              onSelect={() => set("mndaTermType", "continues")}
            >
              Continues until terminated in accordance with the terms of the MNDA.
            </RadioCard>
          </div>
        </Field>

        <Field
          label="Term of Confidentiality"
          hint="How long Confidential Information is protected"
        >
          <div className="space-y-2">
            <RadioCard
              name="confidentialityTermType"
              checked={data.confidentialityTermType === "years"}
              onSelect={() => set("confidentialityTermType", "years")}
            >
              <span className="inline-flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className={numberInlineClass}
                  value={data.confidentialityTermYears}
                  onFocus={() => set("confidentialityTermType", "years")}
                  onChange={(e) => setPositiveYears("confidentialityTermYears", e.target.value)}
                />
                year(s) from Effective Date (trade secrets protected until no
                longer a trade secret).
              </span>
            </RadioCard>
            <RadioCard
              name="confidentialityTermType"
              checked={data.confidentialityTermType === "perpetuity"}
              onSelect={() => set("confidentialityTermType", "perpetuity")}
            >
              In perpetuity.
            </RadioCard>
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Governing Law" hint="e.g. Delaware">
            <input
              type="text"
              className={inputClass}
              value={data.governingLaw}
              onChange={(e) => set("governingLaw", e.target.value)}
              placeholder="State"
            />
          </Field>

          <Field label="Jurisdiction" hint="e.g. New Castle, DE">
            <input
              type="text"
              className={inputClass}
              value={data.jurisdiction}
              onChange={(e) => set("jurisdiction", e.target.value)}
              placeholder="City or county and state"
            />
          </Field>
        </div>

        <Field
          label="MNDA Modifications"
          hint="Optional — list any modifications to the standard terms"
        >
          <textarea
            className={textareaClass}
            rows={2}
            value={data.modifications}
            onChange={(e) => set("modifications", e.target.value)}
          />
        </Field>
      </SectionCard>

      <PartySectionCard
        title="Party 1"
        party={data.party1}
        onChange={(field, value) => setParty("party1", field, value)}
      />
      <PartySectionCard
        title="Party 2"
        party={data.party2}
        onChange={(field, value) => setParty("party2", field, value)}
      />
    </form>
  );
}

function PartySectionCard({
  title,
  party,
  onChange,
}: {
  title: string;
  party: PartyInfo;
  onChange: (field: keyof PartyInfo, value: string) => void;
}) {
  return (
    <SectionCard
      icon={<UserIcon />}
      title={title}
      description="Signing details for this party."
    >
      <Field label="Print Name">
        <input
          type="text"
          className={inputClass}
          value={party.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            type="text"
            className={inputClass}
            value={party.title}
            onChange={(e) => onChange("title", e.target.value)}
          />
        </Field>
        <Field label="Company">
          <input
            type="text"
            className={inputClass}
            value={party.company}
            onChange={(e) => onChange("company", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Notice Address" hint="Email or postal address">
        <input
          type="text"
          className={inputClass}
          value={party.noticeAddress}
          onChange={(e) => onChange("noticeAddress", e.target.value)}
        />
      </Field>
    </SectionCard>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-neutral-100 bg-neutral-50/60 px-5 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-800">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-neutral-500">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function RadioCard({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
        checked
          ? "border-indigo-300 bg-indigo-50/70 text-neutral-900"
          : "border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0">
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onSelect}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-2 ${
            checked ? "border-indigo-500" : "border-neutral-300"
          }`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
        </span>
      </span>
      <span>{children}</span>
    </label>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={1.6} stroke="currentColor">
      <path
        d="M8 3.5h5.5L18 8v10.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 18.5V5A1.5 1.5 0 0 1 8.5 3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 3.5V8H18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12h5M9.5 14.5h5M9.5 17h3" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={1.6} stroke="currentColor">
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M5.5 19c0-3.31 2.91-6 6.5-6s6.5 2.69 6.5 6" strokeLinecap="round" />
    </svg>
  );
}

const inputClass =
  "block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";
const textareaClass = `${inputClass} resize-none`;
const numberInlineClass =
  "w-16 rounded-md border border-neutral-300 bg-white px-2 py-1 text-center text-sm shadow-sm transition-colors hover:border-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";
