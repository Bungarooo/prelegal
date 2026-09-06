import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NdaChat from "./NdaChat";
import { defaultNdaFormData } from "@/lib/nda";

function mockFetchResponse(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
}

describe("NdaChat", () => {
  it("shows a greeting on mount without calling the backend", () => {
    global.fetch = vi.fn();
    render(<NdaChat data={defaultNdaFormData()} onChange={vi.fn()} />);

    expect(screen.getByText(/i'll help you put together your mutual nda/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends the conversation and current fields, then merges the returned fields", async () => {
    global.fetch = mockFetchResponse(true, {
      reply: "Got it, thanks!",
      fields: { party1: { name: "Alice" }, purpose: null },
    });
    const onChange = vi.fn();
    const data = defaultNdaFormData();
    render(<NdaChat data={data} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/chat message/i), "My name is Alice");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Got it, thanks!")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" })
    );
    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const requestBody = JSON.parse(requestInit.body as string);
    expect(requestBody.fields).toEqual(data);
    expect(requestBody.messages.at(-1)).toEqual({ role: "user", content: "My name is Alice" });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ party1: expect.objectContaining({ name: "Alice" }) }));
  });

  it("shows an error message when the request fails", async () => {
    global.fetch = mockFetchResponse(false, { detail: "boom" });
    render(<NdaChat data={defaultNdaFormData()} onChange={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/chat message/i), "hello");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("disables the send button when the input is empty", () => {
    render(<NdaChat data={defaultNdaFormData()} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });
});
