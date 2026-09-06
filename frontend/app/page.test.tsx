import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("shows the login screen before the NDA app", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /log in to prelegal/i })).toBeInTheDocument();
    expect(screen.queryByText(/mutual nda creator/i)).not.toBeInTheDocument();
  });

  it("reveals the NDA app after logging in", async () => {
    render(<Home />);

    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "anything");
    await userEvent.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByText(/mutual nda creator/i)).toBeInTheDocument();
  });
});
