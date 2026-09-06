import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DocumentPicker from "./DocumentPicker";

const DOCUMENTS = [
  { slug: "mutual-nda", name: "Mutual Non-Disclosure Agreement", description: "An MNDA." },
  { slug: "cloud-service-agreement", name: "Cloud Service Agreement", description: "A CSA." },
];

function mockFetchRouter(handlers: Record<string, { ok: boolean; body: unknown }>) {
  return vi.fn().mockImplementation((url: string) => {
    for (const [prefix, { ok, body }] of Object.entries(handlers)) {
      if (url.startsWith(prefix)) {
        return Promise.resolve({ ok, json: () => Promise.resolve(body) });
      }
    }
    throw new Error(`Unhandled fetch: ${url}`);
  });
}

describe("DocumentPicker", () => {
  it("lists the catalog documents and selects one on click", async () => {
    global.fetch = mockFetchRouter({ "/api/documents": { ok: true, body: DOCUMENTS } });
    const onSelect = vi.fn();
    render(<DocumentPicker onSelect={onSelect} />);

    const card = await screen.findByRole("button", { name: /cloud service agreement/i });
    await userEvent.click(card);

    expect(onSelect).toHaveBeenCalledWith("cloud-service-agreement", "Cloud Service Agreement");
  });

  it("shows a load error when the catalog fails to fetch", async () => {
    global.fetch = mockFetchRouter({ "/api/documents": { ok: false, body: {} } });
    render(<DocumentPicker onSelect={vi.fn()} />);

    expect(await screen.findByText(/could not load the document catalog/i)).toBeInTheDocument();
  });

  it("routes free text to a suggested document via the ask box", async () => {
    global.fetch = mockFetchRouter({
      "/api/documents/route": {
        ok: true,
        body: {
          matched_slug: "cloud-service-agreement",
          suggested_slug: "cloud-service-agreement",
          reply: "Let's set up your Cloud Service Agreement.",
        },
      },
      "/api/documents": { ok: true, body: DOCUMENTS },
    });
    const onSelect = vi.fn();
    render(<DocumentPicker onSelect={onSelect} />);
    await screen.findByRole("button", { name: /cloud service agreement/i });

    await userEvent.type(
      screen.getByLabelText(/describe the document you need/i),
      "I need a SaaS agreement"
    );
    await userEvent.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(await screen.findByText(/let's set up your cloud service agreement/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /start cloud service agreement/i }));
    expect(onSelect).toHaveBeenCalledWith("cloud-service-agreement", "Cloud Service Agreement");
  });
});
