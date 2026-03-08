import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));
vi.mock("@/actions/get-projects", () => ({ getProjects: vi.fn() }));
vi.mock("@/actions/create-project", () => ({ createProject: vi.fn() }));

import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "new-project-id" });
  });

  test("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("calls signIn action with email and password", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
    });

    test("isLoading is false after sign in completes", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("isLoading is false after sign in throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the result from the signIn action", async () => {
      const mockResult = { success: false, error: "Invalid credentials" };
      (signInAction as any).mockResolvedValue(mockResult);
      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("does not navigate when signIn fails", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrongpass");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    test("calls signUp action with email and password", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "securepass");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "securepass");
    });

    test("returns the result from the signUp action", async () => {
      const mockResult = { success: false, error: "Email already in use" };
      (signUpAction as any).mockResolvedValue(mockResult);
      const { result } = renderHook(() => useAuth());

      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "pass");
      });

      expect(returnValue).toEqual(mockResult);
    });

    test("does not navigate when signUp fails", async () => {
      (signUpAction as any).mockResolvedValue({ success: false, error: "Email already in use" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "pass");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("isLoading is false after signUp completes", async () => {
      (signUpAction as any).mockResolvedValue({ success: false, error: "Email already in use" });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("isLoading is false after signUp throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("Server error"));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post sign-in navigation", () => {
    test("saves anon work as a project and redirects to it when anon work exists", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "/App.jsx": { content: "export default () => <div />" } },
      };
      (getAnonWorkData as any).mockReturnValue(anonWork);
      (signInAction as any).mockResolvedValue({ success: true });
      (createProject as any).mockResolvedValue({ id: "saved-anon-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/saved-anon-project");
      expect(getProjects).not.toHaveBeenCalled();
    });

    test("does not save anon work when messages array is empty", async () => {
      (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("redirects to most recent project when user has projects and no anon work", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
      expect(createProject).not.toHaveBeenCalled();
    });

    test("creates a new project and redirects when user has no existing projects", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "brand-new-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-project");
    });

    test("same post sign-in logic applies after successful signUp", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([{ id: "first-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/first-project");
    });
  });
});
