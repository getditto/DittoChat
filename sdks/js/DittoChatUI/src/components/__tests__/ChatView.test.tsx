import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatView from "../ChatView";
import type { Chat } from "../../types";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";
import type { MessageBubbleProps } from "../MessageBubble";
import type { MessageInputProps } from "../MessageInput";
import { EmojiClickData } from "emoji-picker-react";
import type { ChatStore } from "@dittolive/ditto-chat-core";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import type Room from "@dittolive/ditto-chat-core/dist/types/Room";

// Mock dependencies
vi.mock("../MessageBubble", () => ({
    default: ({ message, onStartEdit, onDeleteMessage, onAddReaction, onRemoveReaction }: MessageBubbleProps) => (
        <div data-testid={`message-${message._id}`}>
            {message.text}
            <button onClick={() => onStartEdit(message)}>Edit</button>
            <button onClick={() => onDeleteMessage(message._id)}>Delete</button>
            <button onClick={() => onAddReaction(message, { emoji: "👍", unified: "1f44d" } as EmojiClickData)}>Add Reaction</button>
            <button onClick={() => onRemoveReaction(message, "user-1", "👍")}>Remove Reaction</button>
        </div>
    ),
}));

vi.mock("../MessageInput", () => ({
    default: ({ onSendMessage, onSendImage, onSendFile, onCancelEdit, onSaveEdit }: MessageInputProps) => (
        <div>
            <input data-testid="message-input" />
            <button onClick={() => onSendMessage("New message", [])}>Send</button>
            <button onClick={() => onSendImage?.({ name: "image.png" } as File, "caption")}>Send Image</button>
            <button onClick={() => onSendFile?.({ name: "doc.pdf" } as File, "caption")}>Send File</button>
            <button onClick={onCancelEdit}>Cancel Edit</button>
            <button onClick={() => onSaveEdit("Edited text", [])}>Save Edit</button>
        </div>
    ),
}));

vi.mock("../Icons", () => ({
    Icons: {
        arrowLeft: () => <div data-testid="icon-arrow-left" />,
        plus: () => <div data-testid="icon-plus" />,
    },
}));

vi.mock("../Avatar", () => ({
    default: () => <div data-testid="avatar" />,
}));

// Mock Ditto hooks
const mockUseDittoChatStore = vi.fn();

vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: <T,>(selector: (state: ChatStore) => T) => mockUseDittoChatStore(selector),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockChat: Chat = {
    id: "room-1",
    name: "General",
    type: "group",
    participants: [],
    messages: [],
};

const mockMessages: MessageWithUser[] = [
    {
        id: "msg-1",
        message: {
            _id: "msg-1",
            roomId: "room-1",
            text: "Hello",
            createdOn: new Date().toISOString(),
            userId: "user-1",
            isDeleted: false,
            isEdited: false,
            isArchived: false,
            reactions: [{ emoji: "👍", userId: "user-1", unified: "1f44d", unifiedWithoutSkinTone: "1f44d" }],
        },
        user: {
            _id: "user-1",
            name: "Alice",
            subscriptions: {},
            mentions: {},
        },
    },
];

describe("ChatView", () => {
    const defaultProps = {
        chat: mockChat,
        onBack: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1", subscriptions: {} },
                allUsers: [],
                createMessage: vi.fn().mockResolvedValue(undefined),
                createImageMessage: vi.fn(),
                createFileMessage: vi.fn(),
                fetchAttachment: vi.fn(),
                addReactionToMessage: vi.fn(),
                removeReactionFromMessage: vi.fn(),
                saveEditedTextMessage: vi.fn(),
                saveDeletedMessage: vi.fn(),
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
                subscribeToRoom: vi.fn().mockResolvedValue(undefined),
                rooms: [{ _id: "room-1", name: "General" }],
            };
            return selector(state as unknown as ChatStore);
        });
    });

    it("renders chat header and messages", () => {
        render(<ChatView {...defaultProps} />);
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("handles back button click", () => {
        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByTestId("icon-arrow-left").parentElement!);
        expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it("sends a new message", () => {
        const createMessageMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                createMessage: createMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByText("Send"));
        expect(createMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "room-1" }),
            "New message",
            []
        );
    });

    it("handles message deletion", () => {
        const saveDeletedMessageMock = vi.fn();
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                saveDeletedMessage: saveDeletedMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByText("Delete"));
        expect(saveDeletedMessageMock).toHaveBeenCalled();
    });

    it("renders empty state when no messages", () => {
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": [] },
                currentUser: { _id: "user-1" },
                allUsers: [],
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.queryByText("Hello")).not.toBeInTheDocument();
    });

    it("scrolls to bottom on new message", () => {
        render(<ChatView {...defaultProps} />);
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("marks room as read on mount", () => {
        const markRoomAsReadMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: markRoomAsReadMock,
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        expect(markRoomAsReadMock).toHaveBeenCalledWith("room-1");
    });

    it("handles room subscription", async () => {
        const subscribeToRoomMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1", subscriptions: {} },
                allUsers: [],
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
                subscribeToRoom: subscribeToRoomMock,
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);

        const subscribeButton = screen.getByText("Subscribe");
        fireEvent.click(subscribeButton);

        expect(subscribeToRoomMock).toHaveBeenCalledWith("room-1");
    });

    it("shows subscribed state", () => {
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1", subscriptions: { "room-1": {} } },
                allUsers: [],
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        expect(screen.getByText("Subscribed")).toBeInTheDocument();
    });

    it("sends image message", () => {
        const createImageMessageMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                createImageMessage: createImageMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByText("Send Image"));
        expect(createImageMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "room-1" }),
            expect.objectContaining({ name: "image.png" }),
            "caption"
        );
    });

    it("sends file message", () => {
        const createFileMessageMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                createFileMessage: createFileMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByText("Send File"));
        expect(createFileMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "room-1" }),
            expect.objectContaining({ name: "doc.pdf" }),
            "caption"
        );
    });

    it("handles message editing", async () => {
        const saveEditedTextMessageMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                saveEditedTextMessage: saveEditedTextMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);

        // Start edit
        fireEvent.click(screen.getByText("Edit"));

        // Save edit
        fireEvent.click(screen.getByText("Save Edit"));

        expect(saveEditedTextMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "msg-1", text: "Edited text" }),
            expect.objectContaining({ _id: "room-1" })
        );
    });

    it("handles adding reaction", () => {
        const addReactionToMessageMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                addReactionToMessage: addReactionToMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByText("Add Reaction"));

        expect(addReactionToMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "msg-1" }),
            expect.objectContaining({ _id: "room-1" }),
            expect.objectContaining({ emoji: "👍" })
        );
    });

    it("handles removing reaction", () => {
        const removeReactionFromMessageMock = vi.fn().mockResolvedValue(undefined);
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                messagesByRoom: { "room-1": mockMessages },
                currentUser: { _id: "user-1" },
                allUsers: [],
                removeReactionFromMessage: removeReactionFromMessageMock,
                rooms: [{ _id: "room-1", name: "General" }],
                markRoomAsRead: vi.fn().mockResolvedValue(undefined),
            };
            return selector(state as unknown as ChatStore);
        });

        render(<ChatView {...defaultProps} />);
        fireEvent.click(screen.getByText("Remove Reaction"));

        expect(removeReactionFromMessageMock).toHaveBeenCalled();
    });
});
