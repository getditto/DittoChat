import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToastProvider, useToast } from "../ToastProvider";
import React from "react";

// Mock Toast component to avoid animation delays in tests
vi.mock("../Toast", () => ({
    default: ({ message, onClose }: any) => (
        <div data-testid="toast">
            {message}
            <button onClick={onClose}>Close</button>
        </div>
    ),
}));

const TestComponent = () => {
    const { addToast } = useToast();
    return (
        <button onClick={() => addToast("test-id", "Hello World", "info")}>
            Show Toast
        </button>
    );
};

describe("ToastProvider", () => {
    it("provides addToast function", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        expect(screen.getByTestId("toast")).toHaveTextContent("Hello World");
    });

    it("removes toast when closed", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        expect(screen.getByTestId("toast")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Close"));
        expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
    });

    it("does not add duplicate toast with same id", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        fireEvent.click(screen.getByText("Show Toast"));

        expect(screen.getAllByTestId("toast")).toHaveLength(1);
    });
});
