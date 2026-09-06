import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DocumentPreview from "./DocumentPreview";

describe("DocumentPreview", () => {
  it("renders markdown headings, tables, and lists", () => {
    const markdown = [
      "# Cloud Service Agreement",
      "",
      "| Term | Value |",
      "|---|---|",
      "| Customer | Acme, Inc. |",
      "",
      "1. Service",
      "    1. Access and Use. Details here.",
    ].join("\n");

    render(<DocumentPreview markdown={markdown} />);

    expect(screen.getByRole("heading", { name: "Cloud Service Agreement" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Acme, Inc." })).toBeInTheDocument();
    expect(screen.getByText(/access and use\. details here\./i)).toBeInTheDocument();
  });
});
