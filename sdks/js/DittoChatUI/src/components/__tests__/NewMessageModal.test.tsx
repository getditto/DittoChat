import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NewMessageModal from "../NewMessageModal";
import type { ChatStore } from "@dittolive/ditto-chat-core";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";

// Mock dependencies
vi.mock("../Avatar", () => ({
    default: () => <div data-testid="avatar" />,
}));

vi.mock("../Icons", () => ({
    Icons: {
        x: () => <div data-testid="icon-x" />,
        search: () => <div data-testid="icon-search" />,
    },
}));

const mockUseDittoChatStore = vi.fn();
vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: <T,>(selector: (state: ChatStore) => T) => mockUseDittoChatStore(selector),
}));

const mockUsers: ChatUser[] = [
    { _id: "user-1", name: "Me", subscriptions: {}, mentions: {} },
    { _id: "user-2", name: "Alice", subscriptions: {}, mentions: {} },
    { _id: "user-3", name: "Bob", subscriptions: {}, mentions: {} },
];

describe("NewMessageModal", () => {
    const defaultProps = {
        onNewDMCreate: vi.fn(),
        onClose: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                allUsers: mockUsers,
                currentUser: mockUsers[0],
            };
            return selector(state as unknown as ChatStore);
        });
    });

    it("renders modal with user list excluding current user", () => {
        render(<NewMessageModal {...defaultProps} />);

        expect(screen.getByText("New Message")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();

        // Should show Alice and Bob, but not Me
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
        expect(screen.queryByText("Me")).not.toBeInTheDocument();
    });

    it("filters users based on search term", () => {
        render(<NewMessageModal {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search");
        fireEvent.change(searchInput, { target: { value: "Ali" } });

        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    });

    it("calls onNewDMCreate when a user is selected", () => {
        render(<NewMessageModal {...defaultProps} />);

        fireEvent.click(screen.getByText("Alice"));

        expect(defaultProps.onNewDMCreate).toHaveBeenCalledWith(mockUsers[1]);
    });

    it("calls onClose when close button is clicked", () => {
        render(<NewMessageModal {...defaultProps} />);

        fireEvent.click(screen.getByRole("button", { name: "" })); // The close button has the icon

        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
