import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatListItem from "../ChatListItem";
import type { Chat } from "../../types";
import type { ChatStore } from "@dittolive/ditto-chat-core";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";

// Mock dependencies
vi.mock("../Avatar", () => ({
    default: () => <div data-testid="avatar" />,
}));

const mockUseDittoChatStore = vi.fn();
vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: <T,>(selector: (state: ChatStore) => T) => mockUseDittoChatStore(selector),
}));

const mockChat: Chat = {
    id: "chat-1",
    name: "General",
    type: "group",
    participants: [],
    messages: [
        {
            _id: "msg-1",
            roomId: "chat-1",
            text: "Hello",
            createdOn: new Date().toISOString(),
            userId: "user-2",
            isDeleted: false,
            isEdited: false,
            isArchived: false,
        },
    ],
};

const mockUsers: ChatUser[] = [
    {
        _id: "user-1",
        name: "Me",
        subscriptions: {},
        mentions: {},
    },
    {
        _id: "user-2",
        name: "Alice",
        subscriptions: {},
        mentions: {},
    },
];

describe("ChatListItem", () => {
    const defaultProps = {
        chat: mockChat,
        users: mockUsers,
        currentUserId: "user-1",
        isSelected: false,
        onSelect: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                currentUser: mockUsers[0],
                messagesByRoom: {
                    "chat-1": [
                        {
                            id: "msg-1",
                            message: mockChat.messages[0],
                            user: mockUsers[1],
                        },
                    ],
                },
            };
            return selector(state);
        });
    });

    it("renders chat name and last message", () => {
        render(<ChatListItem {...defaultProps} />);
        expect(screen.getByText("General")).toBeInTheDocument();
        expect(screen.getByText("Hello")).toBeInTheDocument();
        expect(screen.getByText("Alice:")).toBeInTheDocument();
    });

    it("renders 'You' for own messages", () => {
        const ownMessageChat = {
            ...mockChat,
            messages: [
                {
                    ...mockChat.messages[0],
                    userId: "user-1",
                },
            ],
        };

        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                currentUser: mockUsers[0],
                messagesByRoom: {
                    "chat-1": [
                        {
                            id: "msg-1",
                            message: ownMessageChat.messages[0],
                            user: mockUsers[0],
                        },
                    ],
                },
            };
            return selector(state);
        });

        render(<ChatListItem {...defaultProps} chat={ownMessageChat} />);
        expect(screen.getByText("You:")).toBeInTheDocument();
    });

    it("handles selection", () => {
        render(<ChatListItem {...defaultProps} />);
        fireEvent.click(screen.getByRole("button"));
        expect(defaultProps.onSelect).toHaveBeenCalled();
    });

    it("displays unread count", () => {

        const unreadChat = { ...mockChat };

        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                currentUser: {
                    ...mockUsers[0],
                    subscriptions: { "chat-1": new Date(Date.now() - 10000).toISOString() }
                },
                messagesByRoom: {
                    "chat-1": [
                        {
                            id: "msg-1",
                            message: {
                                ...mockChat.messages[0],
                                createdOn: new Date().toISOString(), // New message
                            },
                            user: mockUsers[1],
                        },
                    ],
                },
            };
            return selector(state);
        });

        render(<ChatListItem {...defaultProps} chat={unreadChat} />);

        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("renders DM chat name correctly", () => {
        const dmChat = {
            ...mockChat,
            type: "dm" as const,
            participants: [
                { _id: "user-1", name: "Me" } as ChatUser,
                { _id: "user-2", name: "Alice" } as ChatUser
            ]
        };

        render(<ChatListItem {...defaultProps} chat={dmChat} />);
        expect(screen.getByText("Alice")).toBeInTheDocument();
    });
});
