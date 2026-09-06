import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DocumentChat from "./DocumentChat";

function mockFetchResponse(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
}

describe("DocumentChat", () => {
  it("shows a document-specific greeting without calling the backend", () => {
    global.fetch = vi.fn();
    render(
      <DocumentChat
        username="alice"
        slug="cloud-service-agreement"
        name="Cloud Service Agreement"
        fields={{}}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/put together your cloud service agreement/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts to the document-specific endpoint and reports the returned fields and markdown", async () => {
    global.fetch = mockFetchResponse(true, {
      reply: "Got it, thanks!",
      fields: { customer: "Acme, Inc." },
      complete: false,
      markdown: "# Cloud Service Agreement",
    });
    const onChange = vi.fn();
    render(
      <DocumentChat
        username="alice"
        slug="cloud-service-agreement"
        name="Cloud Service Agreement"
        fields={{}}
        onChange={onChange}
      />
    );

    await userEvent.type(screen.getByLabelText(/chat message/i), "The customer is Acme, Inc.");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Got it, thanks!")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/documents/cloud-service-agreement/chat",
      expect.objectContaining({ method: "POST" })
    );
    expect(onChange).toHaveBeenCalledWith({ customer: "Acme, Inc." }, "# Cloud Service Agreement");
    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const requestBody = JSON.parse(requestInit.body as string);
    expect(requestBody.username).toBe("alice");
  });

  it("shows an error message when the request fails", async () => {
    global.fetch = mockFetchResponse(false, { detail: "boom" });
    render(
      <DocumentChat
        username="alice"
        slug="cloud-service-agreement"
        name="Cloud Service Agreement"
        fields={{}}
        onChange={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/chat message/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });
});
