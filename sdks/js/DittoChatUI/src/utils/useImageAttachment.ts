import { AttachmentToken } from "@dittolive/ditto";
import { useState, useEffect } from "react";

interface FetchAttachmentResult {
  success: boolean;
  data?: Uint8Array;
  metadata?: Record<string, string>;
  error?: Error;
}

type FetchAttachmentFn = (
  token: AttachmentToken,
  onProgress: (progress: number) => void,
  onComplete: (result: FetchAttachmentResult) => void,
) => void;

interface UseImageAttachmentOptions {
  token: AttachmentToken;
  fetchAttachment?: FetchAttachmentFn;
  autoFetch?: boolean;
}

interface UseImageAttachmentReturn {
  imageUrl: string | null;
  progress: number;
  isLoading: boolean;
  error: string | null;
  fetchImage: () => void;
}

/**
 * Hook to fetch and manage image attachments from Ditto
 *
 * @param options - Configuration options
 * @param options.token - The attachment token to fetch
 * @param options.fetchAttachment - The Ditto fetchAttachment function
 * @param options.autoFetch - Whether to automatically fetch on mount (default: true)
 *
 * @returns Object containing imageUrl, loading state, progress, error, and manual fetch function
 *
 */
export function useImageAttachment({
  token,
  fetchAttachment,
  autoFetch = true,
}: UseImageAttachmentOptions): UseImageAttachmentReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup function for object URLs
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Fetch function
  const fetchImage = () => {
    if (!token) {
      setError("No token provided");
      return;
    }

    if (!fetchAttachment) {
      console.error("fetchAttachment not provided");
      setError("Attachment fetcher missing");
      return;
    }

    if (isLoading) {
      console.log("Already loading, skipping duplicate request");
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    fetchAttachment(
      token,
      (progressValue: number) => setProgress(progressValue),
      (result: FetchAttachmentResult) => {
        setIsLoading(false);
        if (result.success && result.data) {
          try {
            const blob = toBlobFromUint8(result.data, "image/jpeg");
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
          } catch (err) {
            console.error("Error creating image blob:", err);
            setError("Failed to render image");
          }
        } else {
          console.error("Image fetch failed:", result.error);
          setError("Failed to load image");
        }
      },
    );
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && token) {
      // Reset state when token changes
      setImageUrl(null);
      setError(null);
      setProgress(0);
      fetchImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fetchAttachment, autoFetch]);

  return {
    imageUrl,
    progress,
    isLoading,
    error,
    fetchImage,
  };
}

// Utility function to convert various binary types into a Blob

function toBlobFromUint8(
  data: Uint8Array | ArrayBuffer | unknown,
  mime = "image/jpeg",
): Blob {
  if (!data) throw new Error("No data provided for blob conversion");
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data], { type: mime });
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const copy = new Uint8Array(view.byteLength);
    copy.set(
      new Uint8Array(view.buffer, view.byteOffset || 0, view.byteLength),
    );
    return new Blob([copy], { type: mime });
  }
  try {
    const ua = new Uint8Array(data as unknown as Uint8Array);
    return new Blob([ua], { type: mime });
  } catch {
    throw new Error("Unsupported data type for blob conversion");
  }
}
