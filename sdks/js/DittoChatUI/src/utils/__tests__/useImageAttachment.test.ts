import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useImageAttachment } from "../useImageAttachment";

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("useImageAttachment", () => {
    const mockToken = {
        id: "attachment-1",
        url: "http://example.com/image.jpg",
        metadata: {},
    } as any;

    const mockFetchAttachment = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("initializes with default state", () => {
        const { result } = renderHook(() =>
            useImageAttachment({ token: null, fetchAttachment: mockFetchAttachment })
        );

        expect(result.current.imageUrl).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("fetches image automatically on mount", async () => {
        mockFetchAttachment.mockImplementation((token, onProgress, onComplete) => {
            setTimeout(() => {
                onComplete({ success: true, data: new Uint8Array([1, 2, 3]) });
            }, 10);
        });

        const { result } = renderHook(() =>
            useImageAttachment({ token: mockToken, fetchAttachment: mockFetchAttachment })
        );

        await waitFor(() => {
             expect(result.current.isLoading).toBe(true);
        });

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.imageUrl).toBe("blob:mock-url");
        expect(mockFetchAttachment).toHaveBeenCalledWith(mockToken, expect.any(Function), expect.any(Function));
    });

    it("handles fetch error", async () => {
        mockFetchAttachment.mockImplementation((token, onProgress, onComplete) => {
            onComplete({ success: false, error: new Error("Fetch failed") });
        });

        const { result } = renderHook(() =>
            useImageAttachment({ token: mockToken, fetchAttachment: mockFetchAttachment })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.error).toBe("Failed to load image");
        expect(result.current.imageUrl).toBeNull();
    });

    it("updates progress", async () => {
        mockFetchAttachment.mockImplementation((token, onProgress, onComplete) => {
            onProgress(0.5);
            setTimeout(() => {
                onComplete({ success: true, data: new Uint8Array([]) });
            }, 100);
        });

        const { result } = renderHook(() =>
            useImageAttachment({ token: mockToken, fetchAttachment: mockFetchAttachment })
        );

        await waitFor(() => {
            expect(result.current.progress).toBe(0.5);
        });
    });

    it("handles missing fetch function", () => {
        const { result } = renderHook(() =>
            useImageAttachment({ token: mockToken, fetchAttachment: undefined as any })
        );
        expect(result.current.isLoading).toBe(false);
    });

    it("handles blob creation failure", async () => {
        (global.URL.createObjectURL as any).mockImplementationOnce(() => {
            throw new Error("Blob failed");
        });

        mockFetchAttachment.mockImplementation((token, onProgress, onComplete) => {
             onComplete({ success: true, data: new Uint8Array([]) });
        });

        const { result } = renderHook(() =>
            useImageAttachment({ token: mockToken, fetchAttachment: mockFetchAttachment })
        );

        await waitFor(() => {
            expect(result.current.error).toBe("Failed to render image");
        });
    });
});
