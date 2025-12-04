import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToastProvider, useToast } from "../ToastProvider";
import React from "react";

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();

vi.mock("sonner", () => ({
    Toaster: () => <div data-testid="sonner-toaster" />,
    toast: {
        success: (...args: unknown[]) => mockToastSuccess(...args),
        error: (...args: unknown[]) => mockToastError(...args),
        info: (...args: unknown[]) => mockToastInfo(...args),
    },
}));

const TestComponent = ({ type = "info" as "success" | "info" | "error" }) => {
    const { addToast } = useToast();
    return (
        <button onClick={() => addToast("test-id", "Hello World", type)}>
            Show Toast
        </button>
    );
};

describe("ToastProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("provides addToast function and renders Toaster", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        expect(screen.getByTestId("sonner-toaster")).toBeInTheDocument();
    });

    it("calls toast.info for info type", () => {
        render(
            <ToastProvider>
                <TestComponent type="info" />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        expect(mockToastInfo).toHaveBeenCalledWith(
            "Hello World",
            expect.objectContaining({ id: "test-id" })
        );
    });

    it("calls toast.success for success type", () => {
        render(
            <ToastProvider>
                <TestComponent type="success" />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        expect(mockToastSuccess).toHaveBeenCalledWith(
            "Hello World",
            expect.objectContaining({ id: "test-id" })
        );
    });

    it("calls toast.error for error type", () => {
        render(
            <ToastProvider>
                <TestComponent type="error" />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        expect(mockToastError).toHaveBeenCalledWith(
            "Hello World",
            expect.objectContaining({ id: "test-id" })
        );
    });

    it("does not add duplicate toast with same id", () => {
        render(
            <ToastProvider>
                <TestComponent />
            </ToastProvider>
        );

        fireEvent.click(screen.getByText("Show Toast"));
        fireEvent.click(screen.getByText("Show Toast"));

        expect(mockToastInfo).toHaveBeenCalledTimes(1);
    });
});

