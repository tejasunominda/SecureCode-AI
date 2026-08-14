import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import { useAuthStore } from "@/stores/useAuthStore";
import { Toaster } from "@/components/ui/toast/Toaster";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function renderLogin() {
  return render(
    <>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div>Dashboard</div>} />
          <Route path="/register" element={<div>Register</div>} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders all form fields and submit button", () => {
    renderLogin();

    expect(screen.getByPlaceholderText(/Enter your org UUID/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    renderLogin();

    expect(screen.getByText(/Create one/i)).toBeInTheDocument();
  });

  it("submits login form and navigates on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        accessToken: "tok",
        refreshToken: "ref",
        tokenType: "Bearer",
        expiresIn: 900,
        userId: "u1",
        orgId: "o1",
        email: "test@test.com",
        roles: ["ORG_ADMIN"],
      }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/Enter your org UUID/i), {
      target: { value: "org-uuid-1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows error toast on failed login", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      }),
    } as Response);

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/Enter your org UUID/i), {
      target: { value: "org-uuid-1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("shows loading state during submission", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/Enter your org UUID/i), {
      target: { value: "org-uuid-1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeDisabled();
    });

    resolveFetch?.({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        accessToken: "tok",
        refreshToken: "ref",
        tokenType: "Bearer",
        expiresIn: 900,
        userId: "u1",
        orgId: "o1",
        email: "test@test.com",
        roles: ["ORG_ADMIN"],
      }),
    });

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
