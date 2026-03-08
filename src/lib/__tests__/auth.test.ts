import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

describe("auth", () => {
  const mockCookieStore = {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as any).mockResolvedValue(mockCookieStore);
    (SignJWT as any).mockImplementation(() => ({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue("mock-jwt-token"),
    }));
  });

  describe("createSession", () => {
    test("sets an httpOnly cookie with the JWT token", async () => {
      await createSession("user-123", "user@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-jwt-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    test("sets a 7-day cookie expiry", async () => {
      const before = Date.now();
      await createSession("user-123", "user@example.com");

      const [, , options] = mockCookieStore.set.mock.calls[0];
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
      expect(options.expires.getTime()).toBeLessThanOrEqual(Date.now() + sevenDays + 1000);
    });
  });

  describe("getSession", () => {
    test("returns null when no auth cookie is present", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      expect(await getSession()).toBeNull();
    });

    test("returns the session payload for a valid token", async () => {
      const payload = { userId: "user-123", email: "user@example.com", expiresAt: new Date() };
      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      (jwtVerify as any).mockResolvedValue({ payload });

      expect(await getSession()).toEqual(payload);
    });

    test("returns null when token verification fails", async () => {
      mockCookieStore.get.mockReturnValue({ value: "bad-token" });
      (jwtVerify as any).mockRejectedValue(new Error("Invalid token"));

      expect(await getSession()).toBeNull();
    });
  });

  describe("deleteSession", () => {
    test("deletes the auth cookie", async () => {
      await deleteSession();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });
  });

  describe("verifySession", () => {
    function makeRequest(token?: string) {
      return {
        cookies: { get: vi.fn().mockReturnValue(token ? { value: token } : undefined) },
      } as any;
    }

    test("returns null when request has no auth cookie", async () => {
      expect(await verifySession(makeRequest())).toBeNull();
    });

    test("returns the session payload for a valid request token", async () => {
      const payload = { userId: "user-123", email: "user@example.com", expiresAt: new Date() };
      (jwtVerify as any).mockResolvedValue({ payload });

      expect(await verifySession(makeRequest("valid-token"))).toEqual(payload);
    });

    test("returns null when request token is invalid", async () => {
      (jwtVerify as any).mockRejectedValue(new Error("Invalid token"));

      expect(await verifySession(makeRequest("bad-token"))).toBeNull();
    });
  });
});
