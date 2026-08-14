import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { useToastStore } from "@/components/ui/toast/useToastStore";

afterEach(() => {
  cleanup();
  useToastStore.setState({ toasts: [] });
});

// Mock crypto.randomUUID for consistent test behavior
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto;
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    "00000000-0000-4000-8000-000000000000";
}
