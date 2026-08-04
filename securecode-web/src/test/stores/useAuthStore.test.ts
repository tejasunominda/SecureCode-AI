import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAuthStore } from "@/stores/useAuthStore";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockAuthResponse = {
  accessToken: "access-token-123",
  refreshToken: "refresh-token-456",
  tokenType: "Bearer",
  expiresIn: 900,
  userId: "user-uuid-1",
  orgId: "org-uuid-1",
  email: "test@example.com",
  roles: ["ORG_ADMIN"],
};

describe("useAuthStore", () => {
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

  it("login stores tokens and sets user", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockAuthResponse),
    } as Response);

    await useAuthStore.getState().login("org-uuid-1", "test@example.com", "Password123!");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe("access-token-123");
    expect(state.refreshToken).toBe("refresh-token-456");
    expect(state.user).toEqual({
      userId: "user-uuid-1",
      orgId: "org-uuid-1",
      email: "test@example.com",
      roles: ["ORG_ADMIN"],
    });
    expect(localStorage.getItem("securecode_access_token")).toBe("access-token-123");
    expect(localStorage.getItem("securecode_refresh_token")).toBe("refresh-token-456");
    expect(localStorage.getItem("securecode_org_id")).toBe("org-uuid-1");
  });

  it("login throws on invalid credentials", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
      }),
    } as Response);

    await expect(
      useAuthStore.getState().login("org-uuid-1", "bad@example.com", "wrong"),
    ).rejects.toThrow();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("register stores tokens and sets user", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockAuthResponse),
    } as Response);

    await useAuthStore.getState().register("test@example.com", "Password123!", "Test Org", "ORG_ADMIN");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("test@example.com");
    expect(localStorage.getItem("securecode_access_token")).toBe("access-token-123");
    expect(localStorage.getItem("securecode_org_id")).toBe("org-uuid-1");
  });

  it("logout clears state and localStorage", async () => {
    // Set up authenticated state
    localStorage.setItem("securecode_access_token", "some-token");
    localStorage.setItem("securecode_refresh_token", "some-refresh");
    useAuthStore.setState({
      user: { userId: "u1", orgId: "o1", email: "a@b.com", roles: ["ORG_ADMIN"] },
      accessToken: "some-token",
      refreshToken: "some-refresh",
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(localStorage.getItem("securecode_access_token")).toBeNull();
    expect(localStorage.getItem("securecode_refresh_token")).toBeNull();
    expect(localStorage.getItem("securecode_org_id")).toBeNull();
  });

  it("restore sets authenticated when token exists in localStorage", () => {
    localStorage.setItem("securecode_access_token", "stored-token");
    localStorage.setItem("securecode_org_id", "stored-org");

    useAuthStore.getState().restore();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe("stored-token");
    expect(state.user?.orgId).toBe("stored-org");
  });

  it("restore does nothing when no token in localStorage", () => {
    useAuthStore.getState().restore();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it("refresh updates tokens on success", async () => {
    localStorage.setItem("securecode_refresh_token", "old-refresh");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ...mockAuthResponse,
        accessToken: "new-access",
        refreshToken: "new-refresh",
      }),
    } as Response);

    await useAuthStore.getState().refresh();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe("new-access");
    expect(state.refreshToken).toBe("new-refresh");
    expect(localStorage.getItem("securecode_access_token")).toBe("new-access");
  });

  it("refresh calls logout on failure", async () => {
    localStorage.setItem("securecode_refresh_token", "bad-token");
    localStorage.setItem("securecode_access_token", "bad-access");
    useAuthStore.setState({
      user: { userId: "u1", orgId: "o1", email: "a@b.com", roles: ["ORG_ADMIN"] },
      accessToken: "bad-access",
      refreshToken: "bad-token",
      isAuthenticated: true,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({
        error: { code: "INVALID_TOKEN", message: "Invalid token" },
      }),
    } as Response);

    await useAuthStore.getState().refresh();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(localStorage.getItem("securecode_access_token")).toBeNull();
  });
});
