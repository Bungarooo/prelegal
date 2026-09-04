"use client";

import type { NdaFormData, PartyInfo } from "@/lib/nda";

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

  function setParty(partyKey: PartyKey, field: keyof PartyInfo, value: string) {
    onChange({
      ...data,
      [partyKey]: { ...data[partyKey], [field]: value },
    });
  }

  return (
    <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
      <fieldset className="space-y-4">
        <legend className="text-base font-semibold mb-1">Agreement details</legend>

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
            <RadioRow
              name="mndaTermType"
              checked={data.mndaTermType === "expires"}
              onSelect={() => set("mndaTermType", "expires")}
            >
              <span className="inline-flex items-center gap-2">
                Expires
                <input
                  type="number"
                  min={1}
                  className={`${inputClass} w-20`}
                  value={data.mndaTermYears}
                  onFocus={() => set("mndaTermType", "expires")}
                  onChange={(e) =>
                    set("mndaTermYears", Number(e.target.value) || 1)
                  }
                />
                year(s) from Effective Date.
              </span>
            </RadioRow>
            <RadioRow
              name="mndaTermType"
              checked={data.mndaTermType === "continues"}
              onSelect={() => set("mndaTermType", "continues")}
            >
              Continues until terminated in accordance with the terms of the MNDA.
            </RadioRow>
          </div>
        </Field>

        <Field
          label="Term of Confidentiality"
          hint="How long Confidential Information is protected"
        >
          <div className="space-y-2">
            <RadioRow
              name="confidentialityTermType"
              checked={data.confidentialityTermType === "years"}
              onSelect={() => set("confidentialityTermType", "years")}
            >
              <span className="inline-flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className={`${inputClass} w-20`}
                  value={data.confidentialityTermYears}
                  onFocus={() => set("confidentialityTermType", "years")}
                  onChange={(e) =>
                    set("confidentialityTermYears", Number(e.target.value) || 1)
                  }
                />
                year(s) from Effective Date (trade secrets protected until no
                longer a trade secret).
              </span>
            </RadioRow>
            <RadioRow
              name="confidentialityTermType"
              checked={data.confidentialityTermType === "perpetuity"}
              onSelect={() => set("confidentialityTermType", "perpetuity")}
            >
              In perpetuity.
            </RadioRow>
          </div>
        </Field>

        <Field label="Governing Law" hint="e.g. Delaware">
          <input
            type="text"
            className={inputClass}
            value={data.governingLaw}
            onChange={(e) => set("governingLaw", e.target.value)}
            placeholder="State"
          />
        </Field>

        <Field label="Jurisdiction" hint='e.g. "courts located in New Castle, DE"'>
          <input
            type="text"
            className={inputClass}
            value={data.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
            placeholder="City or county and state"
          />
        </Field>

        <Field label="MNDA Modifications" hint="Optional — list any modifications to the standard terms">
          <textarea
            className={textareaClass}
            rows={2}
            value={data.modifications}
            onChange={(e) => set("modifications", e.target.value)}
          />
        </Field>
      </fieldset>

      <PartyFieldset
        title="Party 1"
        party={data.party1}
        onChange={(field, value) => setParty("party1", field, value)}
      />
      <PartyFieldset
        title="Party 2"
        party={data.party2}
        onChange={(field, value) => setParty("party2", field, value)}
      />
    </form>
  );
}

function PartyFieldset({
  title,
  party,
  onChange,
}: {
  title: string;
  party: PartyInfo;
  onChange: (field: keyof PartyInfo, value: string) => void;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-semibold mb-1">{title}</legend>
      <Field label="Print Name">
        <input
          type="text"
          className={inputClass}
          value={party.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </Field>
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
      <Field label="Notice Address" hint="Email or postal address">
        <input
          type="text"
          className={inputClass}
          value={party.noticeAddress}
          onChange={(e) => onChange("noticeAddress", e.target.value)}
        />
      </Field>
    </fieldset>
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
      <span className="block text-sm font-medium text-neutral-700">{label}</span>
      {hint && <span className="block text-xs text-neutral-500 mb-1">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function RadioRow({
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
    <label className="flex items-start gap-2 text-sm text-neutral-800">
      <input
        type="radio"
        name={name}
        className="mt-1"
        checked={checked}
        onChange={onSelect}
      />
      <span>{children}</span>
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";
const textareaClass = `${inputClass} resize-none`;
