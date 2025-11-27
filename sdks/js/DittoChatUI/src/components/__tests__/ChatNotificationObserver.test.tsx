import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatNotificationObserver from "../ChatNotificationObserver";
import type { ChatStore } from "@dittolive/ditto-chat-core";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";
import type Room from "@dittolive/ditto-chat-core/dist/types/Room";

// Mock dependencies
const mockAddToast = vi.fn();
vi.mock("../ToastProvider", () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

const mockRequestPermission = vi.fn();
const mockShowNotification = vi.fn();
vi.mock("../../hooks/useBrowserNotifications", () => ({
    useBrowserNotifications: () => ({
        permission: "granted",
        isSupported: true,
        requestPermission: mockRequestPermission,
        showNotification: mockShowNotification,
    }),
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

    it("shows browser notification when receiving a message from another room", () => {
        render(<ChatNotificationObserver activeRoomId="room-1" />);

        // Simulate receiving a notification
        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: "Hello" },
        };
        const room = { _id: "room-2", name: "General", collectionId: "rooms" };

        handler(messageWithUser, room);

        expect(mockShowNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "#General: Alice",
                body: "Hello",
                tag: "room-2",
                data: { roomId: "room-2" },
            })
        );
    });

    it("does not show notification if active room matches message room", () => {
        render(<ChatNotificationObserver activeRoomId="room-1" />);

        const handler = mockRegisterNotificationHandler.mock.calls[0][0];
        const messageWithUser = {
            id: "msg-1",
            message: { userId: "user-1", text: "Hello" },
        };
        const room = { _id: "room-1", name: "General" };

        handler(messageWithUser, room);

        expect(mockShowNotification).not.toHaveBeenCalled();
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

        expect(mockShowNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "New message from Alice",
                body: "Hey there",
            })
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

        expect(mockShowNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                body: "Sent an attachment",
            })
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

        expect(mockShowNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                body: "This is a very long message th...",
            })
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

        // Should not show notification for unknown user
        expect(mockShowNotification).not.toHaveBeenCalled();
    });
});
