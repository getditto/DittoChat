import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatNotificationObserver } from "../ChatNotificationObserver";
import type { ChatStore } from "@dittolive/ditto-chat-core";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";
import type Room from "@dittolive/ditto-chat-core/dist/types/Room";

// Mock dependencies
const mockAddToast = vi.fn();
vi.mock("../ToastProvider", () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

const mockRegisterNotificationHandler = vi.fn();
const mockUseDittoChatStore = vi.fn();
vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: <T,>(selector: (state: ChatStore) => T) => mockUseDittoChatStore(selector),
}));

const mockUsers: ChatUser[] = [
    { _id: "user-1", name: "Alice", subscriptions: {}, mentions: {} },
    { _id: "user-2", name: "Bob", subscriptions: {}, mentions: {} },
];

describe("ChatNotificationObserver", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                registerNotificationHandler: mockRegisterNotificationHandler,
                allUsers: mockUsers,
            };
            return selector(state);
        });
    });

    it("registers notification handler on mount", () => {
        render(<ChatNotificationObserver activeRoomId={null} />);
        expect(mockRegisterNotificationHandler).toHaveBeenCalled();
    });

    it("shows toast when receiving a message from another room", () => {
        render(<ChatNotificationObserver activeRoomId="room-1" />);

        // Simulate receiving a notification
        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: "Hello" },
        };
        const room = { _id: "room-2", name: "General", collectionId: "rooms" };

        handler(messageWithUser, room);

        expect(mockAddToast).toHaveBeenCalledWith(
            "msg-1",
            "#General: Alice: Hello",
            "info"
        );
    });

    it("does not show toast if active room matches message room", () => {
        render(<ChatNotificationObserver activeRoomId="room-1" />);

        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: "Hello" },
        };
        const room = { _id: "room-1", name: "General" };

        handler(messageWithUser, room);

        expect(mockAddToast).not.toHaveBeenCalled();
    });

    it("handles DM notifications correctly", () => {
        render(<ChatNotificationObserver activeRoomId={null} />);

        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: "Hey there" },
        };
        const room = { _id: "room-2", name: "Alice", collectionId: "dm_rooms" };

        handler(messageWithUser, room);

        expect(mockAddToast).toHaveBeenCalledWith(
            "msg-1",
            "New message from Alice: Hey there",
            "info"
        );
    });

    it("shows 'Sent an attachment' for messages without text", () => {
        render(<ChatNotificationObserver activeRoomId={null} />);

        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: "" },  // No text
        };
        const room = { _id: "room-2", name: "General", collectionId: "rooms" };

        handler(messageWithUser, room);

        expect(mockAddToast).toHaveBeenCalledWith(
            "msg-1",
            "#General: Alice: Sent an attachment",
            "info"
        );
    });

    it("truncates long messages with ellipsis", () => {
        render(<ChatNotificationObserver activeRoomId={null} />);

        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const longText = "This is a very long message that exceeds thirty characters";
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: longText },
        };
        const room = { _id: "room-2", name: "General", collectionId: "rooms" };

        handler(messageWithUser, room);

        expect(mockAddToast).toHaveBeenCalledWith(
            "msg-1",
            "#General: Alice: This is a very long message th...",
            "info"
        );
    });

    it("handles unknown user gracefully", () => {
        render(<ChatNotificationObserver activeRoomId={null} />);

        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-999", text: "Hello" },  // Unknown user
        };
        const room = { _id: "room-2", name: "General", collectionId: "rooms" };

        handler(messageWithUser, room);

        // Should not show toast for unknown user
        expect(mockAddToast).not.toHaveBeenCalled();
    });
});
