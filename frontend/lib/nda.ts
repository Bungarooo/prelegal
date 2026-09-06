export interface PartyInfo {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export type MndaTermType = "expires" | "continues";
export type ConfidentialityTermType = "years" | "perpetuity";

export interface NdaFormData {
  party1: PartyInfo;
  party2: PartyInfo;
  purpose: string;
  effectiveDate: string; // yyyy-mm-dd
  mndaTermType: MndaTermType;
  mndaTermYears: number;
  confidentialityTermType: ConfidentialityTermType;
  confidentialityTermYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
}

export const emptyParty: PartyInfo = {
  name: "",
  title: "",
  company: "",
  noticeAddress: "",
};

type PartyFieldsUpdate = Partial<Record<keyof PartyInfo, string | null>> | null;

/** Shape of the partial field updates the AI chat backend returns each turn. */
export interface NdaFieldsUpdate {
  party1?: PartyFieldsUpdate;
  party2?: PartyFieldsUpdate;
  purpose?: string | null;
  effectiveDate?: string | null;
  mndaTermType?: MndaTermType | null;
  mndaTermYears?: number | null;
  confidentialityTermType?: ConfidentialityTermType | null;
  confidentialityTermYears?: number | null;
  governingLaw?: string | null;
  jurisdiction?: string | null;
  modifications?: string | null;
}

function mergeParty(current: PartyInfo, update: PartyFieldsUpdate | undefined): PartyInfo {
  if (!update) return current;
  return {
    name: update.name ?? current.name,
    title: update.title ?? current.title,
    company: update.company ?? current.company,
    noticeAddress: update.noticeAddress ?? current.noticeAddress,
  };
}

/** Applies a partial field update onto existing form data, keeping any field left null/undefined. */
export function mergeFields(current: NdaFormData, update: NdaFieldsUpdate): NdaFormData {
  return {
    party1: mergeParty(current.party1, update.party1),
    party2: mergeParty(current.party2, update.party2),
    purpose: update.purpose ?? current.purpose,
    effectiveDate: update.effectiveDate ?? current.effectiveDate,
    mndaTermType: update.mndaTermType ?? current.mndaTermType,
    mndaTermYears: update.mndaTermYears ?? current.mndaTermYears,
    confidentialityTermType: update.confidentialityTermType ?? current.confidentialityTermType,
    confidentialityTermYears: update.confidentialityTermYears ?? current.confidentialityTermYears,
    governingLaw: update.governingLaw ?? current.governingLaw,
    jurisdiction: update.jurisdiction ?? current.jurisdiction,
    modifications: update.modifications ?? current.modifications,
  };
}

/** Today's date as a yyyy-mm-dd string in the local timezone (not UTC). */
export function todayLocalIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultNdaFormData(): NdaFormData {
  return {
    party1: { ...emptyParty },
    party2: { ...emptyParty },
    purpose: "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate: todayLocalIso(),
    mndaTermType: "expires",
    mndaTermYears: 1,
    confidentialityTermType: "years",
    confidentialityTermYears: 1,
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
  };
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "[Effective Date]";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Clamps to a positive integer, defaulting to 1 for anything else (NaN, 0, negative, non-finite). */
export function positiveYears(value: number): number {
  const n = Math.floor(value);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function mndaTermText(data: NdaFormData): string {
  return data.mndaTermType === "expires"
    ? `Expires ${positiveYears(data.mndaTermYears)} year(s) from Effective Date.`
    : "Continues until terminated in accordance with the terms of the MNDA.";
}

export function confidentialityTermText(data: NdaFormData): string {
  return data.confidentialityTermType === "years"
    ? `${positiveYears(data.confidentialityTermYears)} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : "In perpetuity.";
}

export function fallback(value: string, placeholder: string): string {
  return value.trim() ? value.trim() : placeholder;
}

/**
 * Turns a standalone Cover Page sentence (capitalized, period-terminated,
 * e.g. "Expires 1 year(s) from Effective Date.") into a lowercase, unpunctuated
 * clause suitable for embedding mid-sentence, e.g. inside "(...)" in Section 5.
 */
function toInlineClause(sentence: string): string {
  const withoutPeriod = sentence.endsWith(".") ? sentence.slice(0, -1) : sentence;
  return withoutPeriod.charAt(0).toLowerCase() + withoutPeriod.slice(1);
}

/** Escapes a value for safe use inside a Markdown table cell (pipes and line breaks). */
function escapeTableCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

/** The Common Paper Mutual NDA Standard Terms (Version 1.0), CC BY 4.0,
 * with the Cover Page cross-references substituted for entered values. */
export function standardTermsParagraphs(data: NdaFormData): string[] {
  // Free-text Purpose is often entered as a full capitalized, period-terminated
  // sentence (it's shown that way standalone on the Cover Page), but clauses 1
  // and 2 embed it mid-sentence after "the" — inline-ify it the same way as the
  // MNDA Term / Confidentiality Term clauses to avoid a stray capital and a
  // period followed by a lowercase conjunction.
  const purpose = toInlineClause(fallback(data.purpose, "[Purpose]"));
  const effectiveDate = formatDate(data.effectiveDate);
  const mndaTerm = mndaTermText(data);
  const confidentialityTerm = confidentialityTermText(data);
  const governingLaw = fallback(data.governingLaw, "[Governing Law]");
  const jurisdiction = fallback(data.jurisdiction, "[Jurisdiction]");

  return [
    `1. **Introduction**. This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page (defined below)) (“**MNDA**”) allows each party (“**Disclosing Party**”) to disclose or make available information in connection with the ${purpose} which (1) the Disclosing Party identifies to the receiving party (“**Receiving Party**”) as “confidential”, “proprietary”, or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure (“**Confidential Information**”). Each party’s Confidential Information also includes the existence and status of the parties’ discussions and information on the Cover Page. Confidential Information includes technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions and know-how. To use this MNDA, the parties must complete and sign a cover page incorporating these Standard Terms (“**Cover Page**”). Each party is identified on the Cover Page and capitalized terms have the meanings given herein or on the Cover Page.`,
    `2. **Use and Protection of Confidential Information**. The Receiving Party shall: (a) use Confidential Information solely for the ${purpose}; (b) not disclose Confidential Information to third parties without the Disclosing Party’s prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors and other representatives having a reasonable need to know for the ${purpose}, provided these representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.`,
    `3. **Exceptions**. The Receiving Party’s obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.`,
    `4. **Disclosures Required by Law**. The Receiving Party may disclose Confidential Information to the extent required by law, regulation or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party’s expense, with the Disclosing Party’s efforts to obtain confidential treatment for the Confidential Information.`,
    `5. **Term and Termination**. This MNDA commences on the Effective Date (${effectiveDate}) and expires at the end of the MNDA Term (${toInlineClause(mndaTerm)}). Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party’s obligations relating to Confidential Information will survive for the Term of Confidentiality (${toInlineClause(confidentialityTerm)}), despite any expiration or termination of this MNDA.`,
    `6. **Return or Destruction of Confidential Information**. Upon expiration or termination of this MNDA or upon the Disclosing Party’s earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party’s written request, destroy all Confidential Information in the Receiving Party’s possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.`,
    `7. **Proprietary Rights**. The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information and its disclosure to the Receiving Party grants no license under such rights.`,
    `8. **Disclaimer**. ALL CONFIDENTIAL INFORMATION IS PROVIDED “AS IS”, WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.`,
    `9. **Governing Law and Jurisdiction**. This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of ${governingLaw}, without regard to the conflict of laws provisions of such ${governingLaw}. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in ${jurisdiction}. Each party irrevocably submits to the exclusive jurisdiction of such ${jurisdiction} in any such suit, action, or proceeding.`,
    `10. **Equitable Relief**. A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.`,
    `11. **General**. Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party’s permitted successors and assigns. Waivers must be signed by the waiving party’s authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the entire agreement of the parties with respect to its subject matter, and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests and approvals under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.`,
  ];
}

export function generateMarkdown(data: NdaFormData): string {
  const p1 = data.party1;
  const p2 = data.party2;
  const lines: string[] = [];

  lines.push("# Mutual Non-Disclosure Agreement");
  lines.push("");
  lines.push(
    "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0, identical to those posted at https://commonpaper.com/standards/mutual-nda/1.0. Any modifications of the Standard Terms are set out below and control over conflicts with the Standard Terms."
  );
  lines.push("");
  lines.push("## Cover Page");
  lines.push("");
  lines.push(`**Purpose:** ${fallback(data.purpose, "[Purpose]")}`);
  lines.push("");
  lines.push(`**Effective Date:** ${formatDate(data.effectiveDate)}`);
  lines.push("");
  lines.push(`**MNDA Term:** ${mndaTermText(data)}`);
  lines.push("");
  lines.push(`**Term of Confidentiality:** ${confidentialityTermText(data)}`);
  lines.push("");
  lines.push(`**Governing Law:** ${fallback(data.governingLaw, "[Governing Law]")}`);
  lines.push("");
  lines.push(`**Jurisdiction:** ${fallback(data.jurisdiction, "[Jurisdiction]")}`);
  lines.push("");
  if (data.modifications.trim()) {
    lines.push(`**MNDA Modifications:** ${data.modifications.trim()}`);
    lines.push("");
  }
  lines.push("By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.");
  lines.push("");
  lines.push("| | Party 1 | Party 2 |");
  lines.push("|---|---|---|");
  lines.push(
    `| Print Name | ${escapeTableCell(fallback(p1.name, ""))} | ${escapeTableCell(fallback(p2.name, ""))} |`
  );
  lines.push(
    `| Title | ${escapeTableCell(fallback(p1.title, ""))} | ${escapeTableCell(fallback(p2.title, ""))} |`
  );
  lines.push(
    `| Company | ${escapeTableCell(fallback(p1.company, ""))} | ${escapeTableCell(fallback(p2.company, ""))} |`
  );
  lines.push(
    `| Notice Address | ${escapeTableCell(fallback(p1.noticeAddress, ""))} | ${escapeTableCell(fallback(p2.noticeAddress, ""))} |`
  );
  lines.push(`| Signature | | |`);
  lines.push(`| Date | | |`);
  lines.push("");
  lines.push("## Standard Terms");
  lines.push("");
  for (const paragraph of standardTermsParagraphs(data)) {
    lines.push(paragraph);
    lines.push("");
  }
  lines.push(
    "Common Paper Mutual Non-Disclosure Agreement (Version 1.0), incorporated by reference, free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)."
  );

  return lines.join("\n");
}

export function suggestedFilename(data: NdaFormData): string {
  const parts = [p(data.party1.company), p(data.party2.company)].filter(Boolean);
  const base = parts.length ? `Mutual-NDA-${parts.join("-and-")}` : "Mutual-NDA";
  return `${base.replace(/[^a-zA-Z0-9-]+/g, "-")}.md`;
}

function p(value: string): string {
  return value.trim();
}
