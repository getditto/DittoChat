import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MessageInput from "../MessageInput";
import { useDittoChatStore } from "@dittolive/ditto-chat-core";

// Mock dependencies
vi.mock("../Icons", () => ({
    Icons: {
        paperclip: () => <div data-testid="icon-paperclip" />,
        arrowUp: () => <div data-testid="icon-arrow-up" />,
        check: () => <div data-testid="icon-check" />,
        x: () => <div data-testid="icon-x" />,
        image: () => <div data-testid="icon-image" />,
        fileText: () => <div data-testid="icon-file-text" />,
    },
}));

vi.mock("../Avatar", () => ({
    default: () => <div data-testid="avatar" />,
}));

vi.mock("@dittolive/ditto-chat-core", () => ({
    useDittoChatStore: vi.fn((selector) => selector({ allUsers: [] })),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe("MessageInput", () => {
    const defaultProps = {
        onSendMessage: vi.fn(),
        onSendImage: vi.fn(),
        onSendFile: vi.fn(),
        editingMessage: null,
        onCancelEdit: vi.fn(),
        onSaveEdit: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders input field", () => {
        render(<MessageInput {...defaultProps} />);
        expect(screen.getByPlaceholderText("Message...")).toBeInTheDocument();
    });

    it("updates text on change", () => {
        render(<MessageInput {...defaultProps} />);
        const input = screen.getByPlaceholderText("Message...");
        fireEvent.change(input, { target: { value: "Hello" } });
        expect(input).toHaveValue("Hello");
    });

    it("calls onSendMessage on send button click", () => {
        render(<MessageInput {...defaultProps} />);
        const input = screen.getByPlaceholderText("Message...");
        fireEvent.change(input, { target: { value: "Hello" } });

        const sendButton = screen.getByTestId("icon-arrow-up").parentElement!;
        fireEvent.click(sendButton);

        expect(defaultProps.onSendMessage).toHaveBeenCalledWith("Hello", []);
        expect(input).toHaveValue("");
    });

    it("calls onSendMessage on Enter (Ctrl/Cmd + Enter)", () => {
        render(<MessageInput {...defaultProps} />);
        const input = screen.getByPlaceholderText("Message...");
        fireEvent.change(input, { target: { value: "Hello" } });

        fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

        expect(defaultProps.onSendMessage).toHaveBeenCalledWith("Hello", []);
    });

    it("toggles attachment menu", () => {
        render(<MessageInput {...defaultProps} />);
        const attachButton = screen.getByTestId("icon-paperclip").parentElement!;

        fireEvent.click(attachButton);
        expect(screen.getByText("Photo")).toBeInTheDocument();

        fireEvent.click(attachButton);
        expect(screen.queryByText("Photo")).not.toBeInTheDocument();
    });

    it("populates input when editing message", () => {
        const editingMessage = {
            _id: "msg-1",
            text: "Editing this",
            mentions: [],
        } as any;

        render(<MessageInput {...defaultProps} editingMessage={editingMessage} />);
        expect(screen.getByPlaceholderText("Edit message...")).toHaveValue("Editing this");
        expect(screen.getByText("Edit Message")).toBeInTheDocument();
    });

    it("calls onSaveEdit when editing", () => {
        const editingMessage = {
            _id: "msg-1",
            text: "Old text",
            mentions: [],
        } as any;

        render(<MessageInput {...defaultProps} editingMessage={editingMessage} />);
        const input = screen.getByPlaceholderText("Edit message...");
        fireEvent.change(input, { target: { value: "New text" } });

        const saveButton = screen.getByTestId("icon-check").parentElement!;
        fireEvent.click(saveButton);

        expect(defaultProps.onSaveEdit).toHaveBeenCalledWith("New text", []);
    });

    it("calls onCancelEdit", () => {
        const editingMessage = {
            _id: "msg-1",
            text: "Old text",
        } as any;

        render(<MessageInput {...defaultProps} editingMessage={editingMessage} />);
        const cancelButton = screen.getByTestId("icon-x").parentElement!;
        fireEvent.click(cancelButton);

        expect(defaultProps.onCancelEdit).toHaveBeenCalled();
    });
    it("shows mentions popup when typing @", () => {
        const mockUsers = [{ _id: "user-2", name: "Bob" }];
        (useDittoChatStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: any) => selector({ allUsers: mockUsers }));

        render(<MessageInput {...defaultProps} />);
        const input = screen.getByPlaceholderText("Message...");
        fireEvent.change(input, { target: { value: "@" } });

        expect(screen.getByText("Bob")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Bob"));
        expect(input).toHaveValue("@Bob ");
    });

    it("calls onSendFile when file is selected", async () => {
        const { container } = render(<MessageInput {...defaultProps} />);
        const attachButton = screen.getByTestId("icon-paperclip").parentElement!;
        fireEvent.click(attachButton);

        const inputs = container.querySelectorAll('input[type="file"]');
        const fileInput = inputs[1];

        const file = new File(["hello"], "hello.png", { type: "image/png" });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(defaultProps.onSendFile).toHaveBeenCalled();
        });
    });
});
