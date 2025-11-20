import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DittoChatUI from "../DittoChatUI";

// Mock dependencies
vi.mock("../components/ChatList", () => ({
    default: () => <div data-testid="chat-list">Chat List</div>,
}));

vi.mock("../components/ChatView", () => ({
    default: () => <div data-testid="chat-view">Chat View</div>,
}));

vi.mock("../components/NewMessageModal", () => ({
    default: () => <div data-testid="new-message-modal">New Message Modal</div>,
}));

vi.mock("../components/NewRoomModal", () => ({
    default: () => <div data-testid="new-room-modal">New Room Modal</div>,
}));

vi.mock("../components/Icons", () => ({
    Icons: {
        messageCircle: () => <div data-testid="icon-message-circle" />,
    },
}));

vi.mock("../components/ToastProvider", () => ({
    ToastProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("../components/ChatNotificationObserver", () => ({
    ChatNotificationObserver: () => null,
}));

vi.mock("../components/ChatListSkeleton", () => ({
    default: () => <div data-testid="chat-list-skeleton">Loading...</div>,
}));

// Mock Ditto hooks
const mockUseDittoChatStore = vi.fn();
const mockUseDittoChat = vi.fn();

vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChat: (...args: any[]) => mockUseDittoChat(...args),
    useDittoChatStore: (selector: any) => mockUseDittoChatStore(selector),
}));

describe("DittoChatUI", () => {
    const defaultProps = {
        ditto: {} as any,
        userCollectionKey: "users",
        userId: "user-1",
        theme: "light" as const,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default store state
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                createDMRoom: vi.fn(),
                createRoom: vi.fn(),
                rooms: [],
                allUsers: [],
                currentUser: { _id: "user-1" },
                roomsLoading: false,
                usersLoading: false,
                messagesLoading: false,
                messagesByRoom: {},
            };
            return selector(state);
        });
    });

    it("renders chat list by default", () => {
        render(<DittoChatUI {...defaultProps} />);
        expect(screen.getByTestId("chat-list")).toBeInTheDocument();
    });

    it("shows loading skeleton when loading", () => {
        mockUseDittoChatStore.mockImplementation((selector) => {
            const state = {
                roomsLoading: true,
                usersLoading: false,
                messagesLoading: false,
                rooms: [],
                allUsers: [],
                currentUser: { _id: "user-1" },
                messagesByRoom: {},
            };
            return selector(state);
        });

        render(<DittoChatUI {...defaultProps} />);
        expect(screen.getByTestId("chat-list-skeleton")).toBeInTheDocument();
    });

    it("initializes ditto chat hook", () => {
        render(<DittoChatUI {...defaultProps} />);
        expect(mockUseDittoChat).toHaveBeenCalledWith({
            ditto: defaultProps.ditto,
            userCollectionKey: defaultProps.userCollectionKey,
            userId: defaultProps.userId,
        });
    });
});
