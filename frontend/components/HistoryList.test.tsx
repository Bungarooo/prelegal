import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HistoryList from "./HistoryList";

const ENTRIES = [
  {
    slug: "pilot-agreement",
    name: "Pilot Agreement",
    fields: { customer: "Acme" },
    markdown: "# Pilot Agreement",
    updated_at: "2026-09-06 12:00:00",
  },
];

function mockFetchResponse(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) });
}

describe("HistoryList", () => {
  it("lists saved documents for the given user and selects one on click", async () => {
    global.fetch = mockFetchResponse(true, ENTRIES);
    const onSelect = vi.fn();
    render(<HistoryList username="alice" onSelect={onSelect} />);

    expect(global.fetch).toHaveBeenCalledWith("/api/documents/history?username=alice");

    const card = await screen.findByRole("button", { name: /pilot agreement/i });
    await userEvent.click(card);

    expect(onSelect).toHaveBeenCalledWith(ENTRIES[0]);
  });

  it("shows an empty-state message when there is no saved history", async () => {
    global.fetch = mockFetchResponse(true, []);
    render(<HistoryList username="alice" onSelect={vi.fn()} />);

    expect(await screen.findByText(/haven't started any documents yet/i)).toBeInTheDocument();
  });

  it("shows a load error when the request fails", async () => {
    global.fetch = mockFetchResponse(false, {});
    render(<HistoryList username="alice" onSelect={vi.fn()} />);

    expect(await screen.findByText(/could not load your document history/i)).toBeInTheDocument();
  });
});
