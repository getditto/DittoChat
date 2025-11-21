import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DittoChatUI from "../DittoChatUI";
import type { ChatStore, DittoConfParams } from "@dittolive/ditto-chat-core";
import type Room from "@dittolive/ditto-chat-core/dist/types/Room";
import type MessageWithUser from "@dittolive/ditto-chat-core/dist/types/MessageWithUser";

// Mock dependencies
vi.mock("../components/ChatList", () => ({
    default: ({ onSelectChat, onNewMessage, chats }: { onSelectChat: (chat: { id: string }) => void; onNewMessage: (type: string) => void; chats?: Array<{ id: string | number; name?: string }> }) => (
        <div data-testid="chat-list">
            <div data-testid="chat-count">{chats?.length || 0}</div>
            <button onClick={() => onSelectChat({ id: "room-1" })}>Select Chat</button>
            <button onClick={() => onNewMessage("newMessage")}>New Message</button>
            <button onClick={() => onNewMessage("newRoom")}>New Room</button>
        </div>
    ),
}));

vi.mock("../components/ChatView", () => ({
    default: ({ onBack }: { onBack: () => void }) => (
        <div data-testid="chat-view">
            <button onClick={onBack}>Back</button>
        </div>
    ),
}));

vi.mock("../components/NewMessageModal", () => ({
    default: ({ onClose, onNewDMCreate }: { onClose: () => void; onNewDMCreate: (user: { _id: string }) => void }) => (
        <div data-testid="new-message-modal">
            <button onClick={onClose}>Close</button>
            <button onClick={() => onNewDMCreate({ _id: "user-2" })}>Create DM</button>
        </div>
    ),
}));

vi.mock("../components/NewRoomModal", () => ({
    default: ({ onClose, onCreateRoom }: { onClose: () => void; onCreateRoom: (name: string) => void }) => (
        <div data-testid="new-room-modal">
            <button onClick={onClose}>Close</button>
            <button onClick={() => onCreateRoom("New Room")}>Create Room</button>
        </div>
    ),
}));

vi.mock("../components/Icons", () => ({
    Icons: {
        messageCircle: () => <div data-testid="icon-message-circle" />,
    },
}));

vi.mock("../components/ToastProvider", () => ({
    ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    useDittoChat: (params: DittoConfParams) => mockUseDittoChat(params),
    useDittoChatStore: <T,>(selector: (state: ChatStore) => T) => mockUseDittoChatStore(selector),
}));

describe("DittoChatUI", () => {
    const defaultProps = {
        ditto: null,
        userCollectionKey: "users",
        userId: "user-1",
        theme: "light" as const,
    };

    let mockState: Partial<ChatStore>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Default store state
        mockState = {
            createDMRoom: vi.fn(),
            createRoom: vi.fn(),
            rooms: [],
            allUsers: [],
            currentUser: { _id: "user-1", name: "", subscriptions: {}, mentions: {} },
            roomsLoading: false,
            usersLoading: false,
            messagesLoading: false,
            messagesByRoom: {},
        };

        mockUseDittoChatStore.mockImplementation((selector) => {
            return selector(mockState as ChatStore);
        });
    });

    it("renders chat list by default", () => {
        render(<DittoChatUI {...defaultProps} />);
        expect(screen.getByTestId("chat-list")).toBeInTheDocument();
    });

    it("shows loading skeleton when loading", () => {
        mockState = {
            ...mockState,
            roomsLoading: true,
        };

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

    it("handles chat selection", () => {
        render(<DittoChatUI {...defaultProps} />);
        fireEvent.click(screen.getByText("Select Chat"));
        expect(screen.getByTestId("chat-view")).toBeInTheDocument();
    });

    it("handles back navigation from chat view", () => {
        render(<DittoChatUI {...defaultProps} />);
        fireEvent.click(screen.getByText("Select Chat"));
        expect(screen.getByTestId("chat-view")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Back"));
        expect(screen.getByTestId("chat-list")).toBeInTheDocument();
    });

    it("opens new message modal", () => {
        render(<DittoChatUI {...defaultProps} />);
        fireEvent.click(screen.getByText("New Message"));
        expect(screen.getByTestId("new-message-modal")).toBeInTheDocument();
    });

    it("opens new room modal", () => {
        render(<DittoChatUI {...defaultProps} />);
        fireEvent.click(screen.getByText("New Room"));
        expect(screen.getByTestId("new-room-modal")).toBeInTheDocument();
    });

    it("handles creating new DM", async () => {
        const createDMRoomMock = vi.fn().mockResolvedValue({ _id: "room-2" });
        mockState = {
            ...mockState,
            createDMRoom: createDMRoomMock,
            rooms: [{ _id: "room-2", name: "", participants: ["user-1", "user-2"], messagesId: "", createdBy: "", createdOn: "", isGenerated: false }] as Room[],
        };

        render(<DittoChatUI {...defaultProps} />);
        fireEvent.click(screen.getByText("New Message"));
        fireEvent.click(screen.getByText("Create DM"));

        expect(createDMRoomMock).toHaveBeenCalledWith(expect.objectContaining({ _id: "user-2" }));
    });

    it("handles creating new room", async () => {
        const createRoomMock = vi.fn().mockResolvedValue({ _id: "room-3" });
        mockState = {
            ...mockState,
            createRoom: createRoomMock,
            rooms: [{ _id: "room-3", name: "New Room", participants: [], messagesId: "", createdBy: "", createdOn: "", isGenerated: false }] as Room[],
        };

        render(<DittoChatUI {...defaultProps} />);
        fireEvent.click(screen.getByText("New Room"));
        fireEvent.click(screen.getByText("Create Room"));

        expect(createRoomMock).toHaveBeenCalledWith("New Room");
    });

    it("applies auto theme based on system preference", () => {
        const matchMediaMock = vi.fn().mockImplementation((query) => ({
            matches: query === "(prefers-color-scheme: dark)",
            media: query,
            onchange: null,
            addListener: vi.fn(), 
            removeListener: vi.fn(), 
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        window.matchMedia = matchMediaMock;

        render(<DittoChatUI {...defaultProps} theme="auto" />);
        const rootDiv = document.querySelector(".web-chat-root > div");
        expect(rootDiv).toHaveClass("dark");
    });

    it("generates chat list correctly from rooms and messages", () => {
        mockState = {
            ...mockState,
            rooms: [
                { _id: "room-1", name: "Room 1", participants: ["user-1", "user-2"], messagesId: "", createdBy: "", createdOn: "", isGenerated: false },
                { _id: "room-2", name: "Room 2", participants: ["user-1", "user-3"], messagesId: "", createdBy: "", createdOn: "", isGenerated: false }, // DM
            ] as Room[],
            allUsers: [
                { _id: "user-1", name: "Me", subscriptions: {}, mentions: {} },
                { _id: "user-2", name: "User 2", subscriptions: {}, mentions: {} },
                { _id: "user-3", name: "User 3", subscriptions: {}, mentions: {} },
            ],
            messagesByRoom: {
                "room-1": [{ message: { _id: "msg-1", roomId: "room-1", createdOn: new Date().toISOString(), text: "Hello", userId: "user-1", isArchived: false }, id: "msg-1" }] as MessageWithUser[],
            },
        };

        render(<DittoChatUI {...defaultProps} />);

        expect(screen.getByTestId("chat-count")).toHaveTextContent("2");
    });

    it("shows empty state when no chats selected on desktop", () => {
        // Mock window.innerWidth
        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1024 });

        render(<DittoChatUI {...defaultProps} />);
        expect(screen.getByText("Select a conversation")).toBeInTheDocument();
    });
});
