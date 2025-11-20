import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QuickReaction from "../QuickReaction";

// Mock Icons
vi.mock("../Icons", () => ({
    Icons: {
        smile: () => <div data-testid="icon-smile" />,
    },
}));

// Mock EmojiPicker
vi.mock("emoji-picker-react", () => ({
    default: ({ onEmojiClick }: any) => (
        <div data-testid="emoji-picker">
            <button onClick={() => onEmojiClick({ emoji: "👍" })}>Thumbs Up</button>
        </div>
    ),
    Theme: { DARK: "dark", LIGHT: "light" },
}));

describe("QuickReaction", () => {
    const defaultProps = {
        onSelect: vi.fn(),
        disabled: false,
        isOwnMessage: false,
    };

    it("renders smile icon", () => {
        render(<QuickReaction {...defaultProps} />);
        expect(screen.getByTestId("icon-smile")).toBeInTheDocument();
    });

    it("opens emoji picker on click", async () => {
        render(<QuickReaction {...defaultProps} />);

        fireEvent.click(screen.getByRole("button"));

        await waitFor(() => {
            expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
        });
    });

    it("calls onSelect when emoji is clicked", async () => {
        render(<QuickReaction {...defaultProps} />);

        fireEvent.click(screen.getByRole("button"));

        await waitFor(() => {
            expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Thumbs Up"));

        // Wait for timeout in component
        await waitFor(() => {
            expect(defaultProps.onSelect).toHaveBeenCalledWith(expect.objectContaining({ emoji: "👍" }));
        }, { timeout: 200 });
    });

    it("closes picker after selection", async () => {
        render(<QuickReaction {...defaultProps} />);

        fireEvent.click(screen.getByRole("button"));

        await waitFor(() => {
            expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Thumbs Up"));

        await waitFor(() => {
            expect(screen.queryByTestId("emoji-picker")).not.toBeInTheDocument();
        });
    });
});
