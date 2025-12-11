import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "../utils/usePermissions";
import type { ChatStore } from "@dittolive/ditto-chat-core";

// Mock useDittoChatStore
const mockUseDittoChatStore = vi.fn();
vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: <T>(selector: (state: ChatStore) => T) => mockUseDittoChatStore(selector),
}));

describe("usePermissions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return true for all permissions when canPerformAction returns true", () => {
        mockUseDittoChatStore.mockImplementation((selector) => {
            // Mock state.canPerformAction to always return true
            const state = {
                canPerformAction: () => true,
            };
            return selector(state);
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.canCreateRoom).toBe(true);
        expect(result.current.canEditOwnMessage).toBe(true);
        expect(result.current.canDeleteOwnMessage).toBe(true);
        expect(result.current.canAddReaction).toBe(true);
        expect(result.current.canRemoveOwnReaction).toBe(true);
        expect(result.current.canMentionUsers).toBe(true);
        expect(result.current.canSubscribeToRoom).toBe(true);
    });

    it("should return false for all permissions when canPerformAction returns false", () => {
        mockUseDittoChatStore.mockImplementation((selector) => {
            // Mock state.canPerformAction to always return false
            const state = {
                canPerformAction: () => false,
            };
            return selector(state);
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.canCreateRoom).toBe(false);
        expect(result.current.canEditOwnMessage).toBe(false);
        expect(result.current.canDeleteOwnMessage).toBe(false);
        expect(result.current.canAddReaction).toBe(false);
        expect(result.current.canRemoveOwnReaction).toBe(false);
        expect(result.current.canMentionUsers).toBe(false);
        expect(result.current.canSubscribeToRoom).toBe(false);
    });

    it("should correctly map specific permissions", () => {
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                canPerformAction: (action: string) => {
                    if (action === "canCreateRoom") { return true; }
                    if (action === "canEditOwnMessage") { return false; }
                    return true;
                },
            };
            return selector(state);
        });

        const { result } = renderHook(() => usePermissions());

        expect(result.current.canCreateRoom).toBe(true);
        expect(result.current.canEditOwnMessage).toBe(false);
    });
});
