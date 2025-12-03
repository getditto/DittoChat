import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// This test file must run BEFORE any other test that initializes chatStore
// to properly test the error case

describe("useDittoChatStore - Uninitialized Store Error", () => {
    beforeEach(async () => {
        // Reset modules to clear the chatStore singleton
        await import("vitest").then(({ vi }) => vi.resetModules());
    });

    it("throws error when chatStore is not initialized", async () => {
        // Dynamically import to get a fresh instance
        const { useDittoChatStore } = await import("../src/useChat");

        // Mock the chatStore as null by accessing the module
        await import("../src/useChat");

        // Try to use the store before initialization
        expect(() => {
            renderHook(() => useDittoChatStore());
        }).toThrow("chatStore must be initialized before useDittoChatStore");
    });

    it("throws error with correct message when accessing uninitialized store with selector", async () => {
        // Dynamically import to get a fresh instance
        const { useDittoChatStore } = await import("../src/useChat");

        // Try to use the store with a selector before initialization
        expect(() => {
            renderHook(() => useDittoChatStore((state) => state.rooms));
        }).toThrow("chatStore must be initialized before useDittoChatStore");
    });
});
