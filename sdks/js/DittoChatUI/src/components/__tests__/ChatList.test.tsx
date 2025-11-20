import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatList from "../ChatList";
import type { Chat } from "../../types";

// Mock dependencies
vi.mock("../ChatListItem", () => ({
    default: ({ chat, onSelect, isSelected }: any) => (
        <div
            data-testid={`chat-item-${chat.id}`}
            onClick={onSelect}
            data-selected={isSelected}
        >
            {chat.name}
        </div>
    ),
}));

vi.mock("../Icons", () => ({
    Icons: {
        chevronDown: () => <div data-testid="icon-chevron-down" />,
        search: () => <div data-testid="icon-search" />,
    },
}));

vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: vi.fn((selector) => selector({ allUsers: [], currentUser: { _id: "user-1" } })),
}));

// Mock react-virtualized
vi.mock("react-virtualized", () => ({
    List: ({ rowRenderer, rowCount }: any) => (
        <div>
            {Array.from({ length: rowCount }).map((_, index) =>
                rowRenderer({ index, key: index, style: {} })
            )}
        </div>
    ),
    AutoSizer: ({ children }: any) => children({ height: 600, width: 400 }),
    CellMeasurer: ({ children }: any) => children,
    CellMeasurerCache: class {
        rowHeight = 60;
    },
}));

const mockChats: Chat[] = [
    {
        id: "chat-1",
        name: "General",
        type: "group",
        participants: [],
        messages: [],
    },
    {
        id: "chat-2",
        name: "Alice",
        type: "dm",
        participants: [],
        messages: [],
    },
];

describe("ChatList", () => {
    const defaultProps = {
        chats: mockChats,
        onSelectChat: vi.fn(),
        onNewMessage: vi.fn(),
        selectedChatId: null,
    };

    it("renders list of chats", () => {
        render(<ChatList {...defaultProps} />);
        expect(screen.getByText("Chats")).toBeInTheDocument();
        expect(screen.getByTestId("chat-item-chat-1")).toBeInTheDocument();
        expect(screen.getByTestId("chat-item-chat-2")).toBeInTheDocument();
    });

    it("filters chats based on search", () => {
        render(<ChatList {...defaultProps} />);
        const searchInput = screen.getByPlaceholderText("Search");
        fireEvent.change(searchInput, { target: { value: "Alice" } });

        expect(screen.queryByTestId("chat-item-chat-1")).not.toBeInTheDocument();
        expect(screen.getByTestId("chat-item-chat-2")).toBeInTheDocument();
    });

    it("handles chat selection", () => {
        render(<ChatList {...defaultProps} />);
        fireEvent.click(screen.getByTestId("chat-item-chat-1"));
        expect(defaultProps.onSelectChat).toHaveBeenCalledWith(mockChats[0]);
    });

    it("handles new message button click", () => {
        render(<ChatList {...defaultProps} />);
        fireEvent.click(screen.getByText("New Message"));
        expect(defaultProps.onNewMessage).toHaveBeenCalledWith("newMessage");
    });
});
