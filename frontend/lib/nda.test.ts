import { describe, expect, it } from "vitest";
import {
  confidentialityTermText,
  defaultNdaFormData,
  fallback,
  formatDate,
  generateMarkdown,
  mndaTermText,
  positiveYears,
  standardTermsParagraphs,
  suggestedFilename,
  todayLocalIso,
  type NdaFormData,
} from "./nda";

function withData(overrides: Partial<NdaFormData>): NdaFormData {
  return { ...defaultNdaFormData(), ...overrides };
}

describe("todayLocalIso", () => {
  it("matches the local calendar date, not the UTC one", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    expect(todayLocalIso()).toBe(expected);
  });
});

describe("formatDate", () => {
  it("formats a yyyy-mm-dd string as a long US date", () => {
    expect(formatDate("2026-01-05")).toBe("January 5, 2026");
  });

  it("returns a placeholder for an empty string", () => {
    expect(formatDate("")).toBe("[Effective Date]");
  });

  it("does not shift the date across a UTC day boundary", () => {
    // 2026-12-31 parsed as UTC midnight would render as Dec 30 in negative
    // UTC-offset timezones if the date weren't parsed as local time.
    expect(formatDate("2026-12-31")).toBe("December 31, 2026");
  });

  it("falls back to the raw string for an unparseable date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("positiveYears", () => {
  it("passes through a normal positive integer", () => {
    expect(positiveYears(5)).toBe(5);
  });

  it("clamps zero to 1", () => {
    expect(positiveYears(0)).toBe(1);
  });

  it("clamps negative numbers to 1", () => {
    expect(positiveYears(-5)).toBe(1);
  });

  it("clamps NaN to 1", () => {
    expect(positiveYears(NaN)).toBe(1);
  });

  it("floors decimal values", () => {
    expect(positiveYears(2.9)).toBe(2);
  });
});

describe("fallback", () => {
  it("returns the trimmed value when non-empty", () => {
    expect(fallback("  Delaware  ", "[Governing Law]")).toBe("Delaware");
  });

  it("returns the placeholder for an empty or whitespace-only value", () => {
    expect(fallback("", "[Governing Law]")).toBe("[Governing Law]");
    expect(fallback("   ", "[Governing Law]")).toBe("[Governing Law]");
  });
});

describe("mndaTermText", () => {
  it("describes a fixed expiration", () => {
    const data = withData({ mndaTermType: "expires", mndaTermYears: 2 });
    expect(mndaTermText(data)).toBe("Expires 2 year(s) from Effective Date.");
  });

  it("describes an open-ended term", () => {
    const data = withData({ mndaTermType: "continues" });
    expect(mndaTermText(data)).toBe(
      "Continues until terminated in accordance with the terms of the MNDA."
    );
  });

  it("never renders a non-positive year count", () => {
    const data = withData({ mndaTermType: "expires", mndaTermYears: -3 });
    expect(mndaTermText(data)).toBe("Expires 1 year(s) from Effective Date.");
  });
});

describe("confidentialityTermText", () => {
  it("describes a fixed term", () => {
    const data = withData({ confidentialityTermType: "years", confidentialityTermYears: 3 });
    expect(confidentialityTermText(data)).toContain("3 year(s) from Effective Date");
  });

  it("describes perpetuity", () => {
    const data = withData({ confidentialityTermType: "perpetuity" });
    expect(confidentialityTermText(data)).toBe("In perpetuity.");
  });
});

describe("standardTermsParagraphs", () => {
  it("substitutes the purpose into clauses 1 and 2", () => {
    const data = withData({ purpose: "Evaluating a joint marketing partnership." });
    const paragraphs = standardTermsParagraphs(data);
    expect(paragraphs[0]).toContain("joint marketing partnership");
    expect(paragraphs[1]).toContain("joint marketing partnership");
  });

  it("embeds a free-text Purpose as a clean inline clause, not a capitalized sentence", () => {
    // Regression test: Purpose is displayed standalone on the Cover Page as a
    // full sentence ("Evaluating whether..."), but clauses 1 and 2 splice it
    // in mid-sentence after "the" — inlining the raw sentence used to produce
    // "...in connection with the Evaluating whether ... party. which (1)...",
    // with a stray capital and a period immediately followed by a lowercase
    // conjunction.
    const data = withData({ purpose: "Evaluating a joint marketing partnership between Acme and Globex." });
    const paragraphs = standardTermsParagraphs(data);
    expect(paragraphs[0]).toContain(
      "in connection with the evaluating a joint marketing partnership between Acme and Globex which"
    );
    expect(paragraphs[1]).toContain(
      "solely for the evaluating a joint marketing partnership between Acme and Globex;"
    );
    expect(paragraphs[0]).not.toContain(". which");
    expect(paragraphs[0]).not.toContain("the Evaluating");
  });

  it("falls back to bracketed placeholders for empty fields", () => {
    const data = withData({ purpose: "", governingLaw: "", jurisdiction: "" });
    const paragraphs = standardTermsParagraphs(data);
    expect(paragraphs[0]).toContain("[Purpose]");
    expect(paragraphs[8]).toContain("[Governing Law]");
    expect(paragraphs[8]).toContain("[Jurisdiction]");
  });

  it("embeds the MNDA Term and Confidentiality Term as clean inline clauses, not full sentences", () => {
    const data = withData({
      mndaTermType: "expires",
      mndaTermYears: 1,
      confidentialityTermType: "years",
      confidentialityTermYears: 1,
    });
    const section5 = standardTermsParagraphs(data)[4];

    // Regression test: these used to inline the full capitalized,
    // period-terminated sentence, producing "...MNDA Term (Expires 1
    // year(s) from Effective Date.)." with a stray capital and double period.
    expect(section5).toContain("MNDA Term (expires 1 year(s) from Effective Date)");
    expect(section5).toContain(
      "Term of Confidentiality (1 year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws)"
    );
    // The old bug inlined a period-terminated sentence inside the parens, so the
    // clause read "...(Expires 1 year(s) from Effective Date.)." — a period
    // immediately before AND after the closing paren.
    expect(section5).not.toContain(".).");
  });

  it("renders perpetuity/continues inline without a leading capital", () => {
    const data = withData({ mndaTermType: "continues", confidentialityTermType: "perpetuity" });
    const section5 = standardTermsParagraphs(data)[4];
    expect(section5).toContain("MNDA Term (continues until terminated");
    expect(section5).toContain("Term of Confidentiality (in perpetuity)");
  });
});

describe("generateMarkdown", () => {
  it("includes bold Markdown emphasis in the Standard Terms, consistent with the Cover Page", () => {
    const md = generateMarkdown(defaultNdaFormData());
    expect(md).toContain("**Purpose:**");
    // Regression test: Standard Terms used to have their **bold** markers
    // stripped, producing a document less richly formatted than its own
    // Cover Page and than the on-screen live preview.
    expect(md).toContain("**Introduction**");
    expect(md).toContain("**Disclosing Party**");
  });

  it("does not include an MNDA Modifications line when empty", () => {
    const md = generateMarkdown(withData({ modifications: "" }));
    expect(md).not.toContain("MNDA Modifications");
  });

  it("includes an MNDA Modifications line when present", () => {
    const md = generateMarkdown(withData({ modifications: "Confidentiality survives 5 years." }));
    expect(md).toContain("**MNDA Modifications:** Confidentiality survives 5 years.");
  });

  it("escapes pipe characters in party fields so the Markdown table doesn't break", () => {
    const data = withData({
      party1: {
        name: "Jane Doe",
        title: "CEO",
        company: "Smith | Jones LLC",
        noticeAddress: "",
      },
    });
    const md = generateMarkdown(data);
    // The escaped row should still be a single well-formed table row: the
    // pipe inside the company name is backslash-escaped (valid CommonMark
    // table syntax), not left as a raw column separator.
    const row = md.split("\n").find((line) => line.includes("Smith"));
    expect(row).toBe("| Company | Smith \\| Jones LLC |  |");
  });

  it("collapses embedded newlines in party fields to spaces", () => {
    const data = withData({
      party1: {
        name: "Jane Doe",
        title: "",
        company: "",
        noticeAddress: "123 Main St\nSuite 400",
      },
    });
    const md = generateMarkdown(data);
    expect(md).toContain("123 Main St Suite 400");
    expect(md).not.toContain("123 Main St\nSuite 400");
  });
});

describe("suggestedFilename", () => {
  it("uses both company names when present", () => {
    const data = withData({
      party1: { ...defaultNdaFormData().party1, company: "Acme Inc" },
      party2: { ...defaultNdaFormData().party2, company: "Globex Corp" },
    });
    expect(suggestedFilename(data)).toBe("Mutual-NDA-Acme-Inc-and-Globex-Corp.md");
  });

  it("falls back to a generic name when no company is given", () => {
    expect(suggestedFilename(defaultNdaFormData())).toBe("Mutual-NDA.md");
  });

  it("sanitizes special characters so the filename is filesystem-safe", () => {
    const data = withData({
      party1: { ...defaultNdaFormData().party1, company: "Smith & Sons, Inc./LLC" },
    });
    expect(suggestedFilename(data)).toMatch(/^Mutual-NDA-Smith-Sons-Inc-LLC\.md$/);
  });
});
