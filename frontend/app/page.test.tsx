import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const DOCUMENTS = [
  { slug: "mutual-nda", name: "Mutual Non-Disclosure Agreement", description: "An MNDA." },
  { slug: "cloud-service-agreement", name: "Cloud Service Agreement", description: "A CSA." },
  { slug: "pilot-agreement", name: "Pilot Agreement", description: "A pilot." },
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

async function loginAndSelectNda() {
  await userEvent.type(screen.getByLabelText(/username/i), "alice");
  await userEvent.type(screen.getByLabelText(/password/i), "secret123");
  await userEvent.click(screen.getByRole("button", { name: /log in/i }));

  await userEvent.click(await screen.findByRole("button", { name: /mutual non-disclosure agreement/i }));
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("Home", () => {
  it("shows the login screen before logging in", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /log in to prelegal/i })).toBeInTheDocument();
    expect(screen.queryByText(/mutual nda creator/i)).not.toBeInTheDocument();
  });

  it("shows the document picker after login, then the NDA app once selected", async () => {
    global.fetch = mockFetchRouter({
      "/api/auth/login": { ok: true, body: { username: "alice" } },
      "/api/documents": { ok: true, body: DOCUMENTS },
    });
    render(<Home />);

    await loginAndSelectNda();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
    expect(await screen.findByText(/mutual nda creator/i)).toBeInTheDocument();
  });

  it("shows an error message when login fails", async () => {
    global.fetch = mockFetchRouter({
      "/api/auth/login": { ok: false, body: { detail: "Invalid username or password" } },
    });
    render(<Home />);

    await userEvent.type(screen.getByLabelText(/username/i), "alice");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
    expect(screen.queryByText(/mutual nda creator/i)).not.toBeInTheDocument();
  });

  it("supports signing up via the toggle link", async () => {
    global.fetch = mockFetchRouter({
      "/api/auth/signup": { ok: true, body: { username: "newuser" } },
      "/api/documents": { ok: true, body: DOCUMENTS },
    });
    render(<Home />);

    await userEvent.click(screen.getByRole("button", { name: /create one/i }));
    expect(screen.getByRole("heading", { name: /create your prelegal account/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/username/i), "newuser");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await userEvent.click(await screen.findByRole("button", { name: /mutual non-disclosure agreement/i }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({ method: "POST" })
    );
    expect(await screen.findByText(/mutual nda creator/i)).toBeInTheDocument();
  });

  it("restores the logged-in session from sessionStorage and shows the picker", async () => {
    sessionStorage.setItem("prelegal_username", "alice");
    global.fetch = mockFetchRouter({ "/api/documents": { ok: true, body: DOCUMENTS } });

    render(<Home />);

    expect(await screen.findByText(/what do you need to draft/i)).toBeInTheDocument();
  });

  it("returns to the login screen and clears the session on sign out", async () => {
    sessionStorage.setItem("prelegal_username", "alice");
    global.fetch = mockFetchRouter({ "/api/documents": { ok: true, body: DOCUMENTS } });
    render(<Home />);

    await userEvent.click(await screen.findByRole("button", { name: /mutual non-disclosure agreement/i }));
    expect(screen.getByText(/mutual nda creator/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(screen.getByRole("heading", { name: /log in to prelegal/i })).toBeInTheDocument();
    expect(sessionStorage.getItem("prelegal_username")).toBeNull();
  });

  it("returns to the picker via Change Document without signing out", async () => {
    sessionStorage.setItem("prelegal_username", "alice");
    global.fetch = mockFetchRouter({ "/api/documents": { ok: true, body: DOCUMENTS } });
    render(<Home />);

    await userEvent.click(await screen.findByRole("button", { name: /mutual non-disclosure agreement/i }));
    await userEvent.click(screen.getByRole("button", { name: /change document/i }));

    expect(await screen.findByText(/what do you need to draft/i)).toBeInTheDocument();
  });

  it("resets the chat greeting when switching between two generic documents", async () => {
    sessionStorage.setItem("prelegal_username", "alice");
    global.fetch = mockFetchRouter({
      "/api/documents/cloud-service-agreement/render": { ok: true, body: { markdown: "# Cloud Service Agreement" } },
      "/api/documents/pilot-agreement/render": { ok: true, body: { markdown: "# Pilot Agreement" } },
      "/api/documents": { ok: true, body: DOCUMENTS },
    });
    render(<Home />);

    await userEvent.click(await screen.findByRole("button", { name: /cloud service agreement/i }));
    expect(await screen.findByText(/put together your cloud service agreement/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /change document/i }));
    await userEvent.click(await screen.findByRole("button", { name: /^pilot agreement/i }));

    expect(await screen.findByText(/put together your pilot agreement/i)).toBeInTheDocument();
    expect(screen.queryByText(/put together your cloud service agreement/i)).not.toBeInTheDocument();
  });

  it("shows a blank preview immediately when selecting a generic document, before any chat message", async () => {
    sessionStorage.setItem("prelegal_username", "alice");
    global.fetch = mockFetchRouter({
      "/api/documents/cloud-service-agreement/render": {
        ok: true,
        body: { markdown: "# Cloud Service Agreement\n\n| Term | Value |\n|---|---|\n| Customer | [Customer] |" },
      },
      "/api/documents": { ok: true, body: DOCUMENTS },
    });
    render(<Home />);

    await userEvent.click(await screen.findByRole("button", { name: /cloud service agreement/i }));

    expect(await screen.findByText(/\[Customer\]/)).toBeInTheDocument();
    expect(screen.queryByText(/start chatting to generate a preview/i)).not.toBeInTheDocument();
  });
});
