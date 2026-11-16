import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { AuthPage } from "@/components/AuthPage";

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: authMocks },
}));

function renderAuthPage(path: string) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthPage />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe("password reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    authMocks.updateUser.mockResolvedValue({ error: null });
  });

  it("sends a password reset email with the recovery route", async () => {
    renderAuthPage("/");
    fireEvent.click(screen.getByRole("button", { name: /forgot password/i }));
    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "driver@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith("driver@example.com", {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });
  });

  it("requires matching passwords before updating the account", async () => {
    renderAuthPage("/reset-password");
    const [password, confirmation] = screen.getAllByLabelText(/password/i);

    fireEvent.change(password, { target: { value: "new-password" } });
    fireEvent.change(confirmation, { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(authMocks.updateUser).not.toHaveBeenCalled();

    fireEvent.change(confirmation, { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));
    await waitFor(() => {
      expect(authMocks.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    });
  });
});
