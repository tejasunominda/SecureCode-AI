import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RegisterPage from "@/pages/RegisterPage";
import { useAuthStore } from "@/stores/useAuthStore";
import { Toaster } from "@/components/ui/toast/Toaster";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function renderRegister() {
  return render(
    <>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<div>Dashboard</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </>,
  );
}

describe("RegisterPage", () => {
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

  it("renders all form fields including role select", () => {
    renderRegister();

    expect(screen.getByPlaceholderText(/Acme Corp/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("renders link to login page", () => {
    renderRegister();

    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
  });

  it("renders all role options from DB seed data", () => {
    renderRegister();

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("HR")).toBeInTheDocument();
    expect(screen.getByText("Technical Manager")).toBeInTheDocument();
    expect(screen.getByText("Candidate")).toBeInTheDocument();
  });

  it("submits registration form and navigates on success", async () => {
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
        email: "new@test.com",
        roles: ["ORG_ADMIN"],
      }),
    } as Response);

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText(/Acme Corp/i), {
      target: { value: "Test Org" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
      target: { value: "new@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
      target: { value: "SecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows error toast on failed registration", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({
        error: { code: "ROLE_NOT_FOUND", message: "Role not found" },
      }),
    } as Response);

    renderRegister();

    fireEvent.change(screen.getByPlaceholderText(/Acme Corp/i), {
      target: { value: "Test Org" },
    });
    fireEvent.change(screen.getByPlaceholderText(/you@company.com/i), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/At least 8 characters/i), {
      target: { value: "SecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText("Role not found")).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
