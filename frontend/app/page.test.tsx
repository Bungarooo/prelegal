import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

function mockFetchResponse(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
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

  it("reveals the NDA app after a successful login", async () => {
    global.fetch = mockFetchResponse(true, { username: "alice" });
    render(<Home />);

    await userEvent.type(screen.getByLabelText(/username/i), "alice");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/mutual nda creator/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows an error message when login fails", async () => {
    global.fetch = mockFetchResponse(false, { detail: "Invalid username or password" });
    render(<Home />);

    await userEvent.type(screen.getByLabelText(/username/i), "alice");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
    expect(screen.queryByText(/mutual nda creator/i)).not.toBeInTheDocument();
  });

  it("supports signing up via the toggle link", async () => {
    global.fetch = mockFetchResponse(true, { username: "newuser" });
    render(<Home />);

    await userEvent.click(screen.getByRole("button", { name: /create one/i }));
    expect(screen.getByRole("heading", { name: /create your prelegal account/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/username/i), "newuser");
    await userEvent.type(screen.getByLabelText(/password/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/mutual nda creator/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("restores the logged-in session from sessionStorage on reload", () => {
    sessionStorage.setItem("prelegal_username", "alice");

    render(<Home />);

    expect(screen.getByText(/mutual nda creator/i)).toBeInTheDocument();
  });
});
