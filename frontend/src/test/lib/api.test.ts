import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("post sends JSON body with Content-Type header", async () => {
    mockFetch.mockResolvedValue(
      mockResponse({ accessToken: "token123" }),
    );

    await api.post("/api/v1/auth/login", { email: "test@test.com" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8081/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@test.com" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("get sends GET request without body", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: "ok" }));

    await api.get("/api/v1/users");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8081/api/v1/users",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("includes Authorization header when token is in localStorage", async () => {
    localStorage.setItem("securecode_access_token", "my-jwt-token");
    mockFetch.mockResolvedValue(mockResponse({ data: "ok" }));

    await api.get("/api/v1/protected");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8081/api/v1/protected",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-jwt-token",
        }),
      }),
    );
  });

  it("does not include Authorization header when no token", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: "ok" }));

    await api.get("/api/v1/public");

    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    expect(callArgs.headers).not.toHaveProperty("Authorization");
  });

  it("throws ApiError on non-ok response with parsed body", async () => {
    mockFetch.mockResolvedValue(
      mockResponse(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        false,
        401,
      ),
    );

    await expect(api.post("/api/v1/auth/login", {})).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });

  it("throws ApiError with defaults when response body is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not JSON")),
    } as unknown as Response);

    await expect(api.get("/api/v1/broken")).rejects.toMatchObject({
      status: 500,
      code: "UNKNOWN",
      message: "An unexpected error occurred",
    });
  });

  it("put sends PUT request with JSON body", async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true }));

    await api.put("/api/v1/users/1", { name: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8081/api/v1/users/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
    );
  });

  it("delete sends DELETE request", async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true }));

    await api.delete("/api/v1/users/1");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8081/api/v1/users/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
