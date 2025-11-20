import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Toast from "../Toast";

// Mock Icons
vi.mock("../Icons", () => ({
    Icons: {
        checkCircle: () => <div data-testid="icon-check-circle" />,
        info: () => <div data-testid="icon-info" />,
        x: () => <div data-testid="icon-x" />,
    },
}));

describe("Toast", () => {
    const defaultProps = {
        message: "Test message",
        type: "info" as const,
        onClose: vi.fn(),
    };

    it("renders message and icon", () => {
        render(<Toast {...defaultProps} />);
        expect(screen.getByText("Test message")).toBeInTheDocument();
        expect(screen.getByTestId("icon-info")).toBeInTheDocument();
    });

    it("renders success toast", () => {
        render(<Toast {...defaultProps} type="success" />);
        expect(screen.getByTestId("icon-check-circle")).toBeInTheDocument();
    });

    it("renders error toast", () => {
        render(<Toast {...defaultProps} type="error" />);
        // Should have 2 x icons: one for the error type and one for the close button
        const icons = screen.getAllByTestId("icon-x");
        expect(icons).toHaveLength(2);
    });

    it("calls onClose when close button is clicked", async () => {
        render(<Toast {...defaultProps} />);

        const closeButton = screen.getByRole("button");
        fireEvent.click(closeButton);

        // Wait for animation timeout
        await waitFor(() => {
            expect(defaultProps.onClose).toHaveBeenCalled();
        }, { timeout: 400 });
    });

    it("auto closes after timeout", async () => {
        vi.useFakeTimers();
        render(<Toast {...defaultProps} />);

        vi.advanceTimersByTime(3300);

        expect(defaultProps.onClose).toHaveBeenCalled();
        vi.useRealTimers();
    });
});
