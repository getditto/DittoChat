import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MessageBubble from "../MessageBubble";
import type Message from "@dittolive/ditto-chat-core/dist/types/Message";
import type ChatUser from "@dittolive/ditto-chat-core/dist/types/ChatUser";

// Mock dependencies
vi.mock("../Icons", () => ({
    Icons: {
        fileText: () => <div data-testid="icon-file-text" />,
        arrowDown: () => <div data-testid="icon-arrow-down" />,
        edit3: () => <div data-testid="icon-edit" />,
        moreHorizontal: () => <div data-testid="icon-more" />,
    },
}));

vi.mock("../QuickReaction", () => ({
    default: () => <div data-testid="quick-reaction" />,
}));

vi.mock("../../utils/useImageAttachment", () => ({
    useImageAttachment: () => ({
        imageUrl: null,
        progress: 0,
        isLoading: false,
        error: null,
        fetchImage: vi.fn(),
    }),
}));

const mockMessage: Message = {
    _id: "msg-1",
    roomId: "room-1",
    text: "Hello world",
    createdOn: new Date().toISOString(),
    isDeleted: false,
    isEdited: false,
    userId: "user-1",
    mentions: [],
    reactions: [],
    isArchived: false,
};

const mockUser: ChatUser = {
    _id: "user-1",
    name: "Alice",
    subscriptions: {},
    mentions: {},
};

describe("MessageBubble", () => {
    const defaultProps = {
        message: mockMessage,
        sender: mockUser,
        currentUserId: "user-2",
        isOwnMessage: false,
        isGroupChat: false,
        showSenderInfo: true,
        onStartEdit: vi.fn(),
        onDeleteMessage: vi.fn(),
        onAddReaction: vi.fn(),
        onRemoveReaction: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders text message correctly", () => {
        render(<MessageBubble {...defaultProps} />);
        expect(screen.getByText("Hello world")).toBeInTheDocument();
        expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("renders own message correctly", () => {
        render(
            <MessageBubble
                {...defaultProps}
                isOwnMessage={true}
                currentUserId="user-1"
            />
        );
        expect(screen.getByText("Hello world")).toBeInTheDocument();
        expect(screen.queryByText("Alice")).not.toBeInTheDocument(); // Should not show name for own message
    });

    it("shows edited status", () => {
        const editedMessage = { ...mockMessage, isEdited: true };
        render(<MessageBubble {...defaultProps} message={editedMessage} />);
        expect(screen.getByText("(edited)")).toBeInTheDocument();
    });

    it("shows deleted message placeholder", () => {
        const deletedMessage = { ...mockMessage, isDeleted: true };
        render(<MessageBubble {...defaultProps} message={deletedMessage} />);
        expect(screen.getByText("[deleted message]")).toBeInTheDocument();
    });

    it("handles actions for own message", () => {
        render(
            <MessageBubble
                {...defaultProps}
                isOwnMessage={true}
                currentUserId="user-1"
            />
        );

        const editButton = screen.getByLabelText("Edit message");
        fireEvent.click(editButton);
        expect(defaultProps.onStartEdit).toHaveBeenCalledWith(mockMessage);
    });
    it("handles reaction addition", () => {
        render(<MessageBubble {...defaultProps} />);

        const reactionButton = screen.getByTestId("quick-reaction");
        expect(reactionButton).toBeInTheDocument();

    });

    it("handles message deletion confirmation", () => {
        const confirmSpy = vi.spyOn(window, "confirm");
        confirmSpy.mockImplementation(() => true);

        render(
            <MessageBubble
                {...defaultProps}
                isOwnMessage={true}
                currentUserId="user-1"
            />
        );

        // Open menu first
        const moreButton = screen.getByLabelText("More options");
        fireEvent.click(moreButton);

        const deleteButton = screen.getByText("Delete message");
        fireEvent.click(deleteButton);

        expect(confirmSpy).toHaveBeenCalled();
        expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith(mockMessage._id);

        confirmSpy.mockRestore();
    });

    it("cancels message deletion", () => {
        const confirmSpy = vi.spyOn(window, "confirm");
        confirmSpy.mockImplementation(() => false);

        render(
            <MessageBubble
                {...defaultProps}
                isOwnMessage={true}
                currentUserId="user-1"
            />
        );

        // Open menu first
        const moreButton = screen.getByLabelText("More options");
        fireEvent.click(moreButton);

        const deleteButton = screen.getByText("Delete message");
        fireEvent.click(deleteButton);

        expect(confirmSpy).toHaveBeenCalled();
        expect(defaultProps.onDeleteMessage).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
    });

    it("renders mentions correctly", () => {
        const mentionMessage = {
            ...mockMessage,
            text: "Hello @Alice",
            mentions: [
                {
                    startIndex: 6,
                    endIndex: 12,
                    userId: "user-1",
                },
            ],
        };
        render(<MessageBubble {...defaultProps} message={mentionMessage} />);
        expect(screen.getByText(/Hello/)).toBeInTheDocument();
        const mention = screen.getByText("@Alice");
        expect(mention).toBeInTheDocument();
        expect(mention.tagName).toBe("SPAN");
        expect(mention.className).toContain("font-semibold");
    });

    it("renders image attachment", () => {
        const imageMessage = {
            ...mockMessage,
            thumbnailImageToken: { id: "token-1", len: 0, metadata: {} } as any,
        };

        render(<MessageBubble {...defaultProps} message={imageMessage} />);
        expect(screen.getByText(/Preparing image/)).toBeInTheDocument();
    });

    it("renders file attachment", () => {
        const fileMessage = {
            ...mockMessage,
            fileAttachmentToken: { id: "token-2", len: 0, metadata: {} } as any,
            text: "document.pdf",
        };

        render(<MessageBubble {...defaultProps} message={fileMessage} />);
        expect(screen.getByText("document.pdf")).toBeInTheDocument();
        expect(screen.getByTestId("icon-file-text")).toBeInTheDocument();
    });
});
