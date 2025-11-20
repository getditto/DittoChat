import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatView from "../ChatView";
import type { Chat } from "../../types";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";

// Mock dependencies
vi.mock("../MessageBubble", () => ({
    default: ({ message, onStartEdit, onDeleteMessage }: any) => (
        <div data-testid={`message-${message._id}`}>
            {message.text}
            <button onClick={() => onStartEdit(message)}>Edit</button>
            <button onClick={() => onDeleteMessage(message._id)}>Delete</button>
        </div>
    ),
}));

vi.mock("../MessageInput", () => ({
    default: ({ onSendMessage }: any) => (
        <div>
            <input data-testid="message-input" />
            <button onClick={() => onSendMessage("New message", [])}>Send</button>
        </div>
    ),
}));

vi.mock("../Icons", () => ({
    Icons: {
        arrowLeft: () => <div data-testid="icon-arrow-left" />,
    },
}));

vi.mock("../Avatar", () => ({
    default: () => <div data-testid="avatar" />,
}));

// Mock Ditto hooks
const mockUseDittoChatStore = vi.fn();

vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: (selector: any) => mockUseDittoChatStore(selector),
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
                currentUser: { _id: "user-1" },
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
                rooms: [{ _id: "room-1", name: "General" }],
            };
            return selector(state);
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
            return selector(state);
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
            return selector(state);
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
            return selector(state);
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
            return selector(state);
        });

        render(<ChatView {...defaultProps} />);
        expect(markRoomAsReadMock).toHaveBeenCalledWith("room-1");
    });
});
