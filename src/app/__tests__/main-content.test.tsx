import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MainContent } from "../main-content";

vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
  useFileSystem: vi.fn(() => ({ fileSystem: null })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
  useChat: vi.fn(() => ({ messages: [], isLoading: false })),
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div>{children}</div>,
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("renders Preview tab as active by default", () => {
  render(<MainContent />);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("clicking Code button switches to code view", () => {
  render(<MainContent />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("clicking Preview button switches back to preview view", () => {
  render(<MainContent />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("toggle buttons work on repeated clicks", () => {
  render(<MainContent />);

  // Switch to code
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeDefined();

  // Switch back to preview
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Switch to code again
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByTestId("code-editor")).toBeDefined();
});
