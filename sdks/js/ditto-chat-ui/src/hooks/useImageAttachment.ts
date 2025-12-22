import { AttachmentToken } from '@dittolive/ditto'
import { useEffect, useState } from 'react'

interface FetchAttachmentResult {
  success: boolean
  data?: Uint8Array
  metadata?: Record<string, string>
  error?: Error
}

type FetchAttachmentFn = (
  token: AttachmentToken,
  onProgress: (progress: number) => void,
  onComplete: (result: FetchAttachmentResult) => void,
) => void

interface UseImageAttachmentOptions {
  token: AttachmentToken | null
  fetchAttachment?: FetchAttachmentFn
  autoFetch?: boolean
}

interface UseImageAttachmentReturn {
  imageUrl: string | null
  progress: number
  isLoading: boolean
  error: string | null
  fetchImage: () => void
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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use a stable key for the token to avoid redundant fetches on re-renders
  const tokenId = token ? (token as any).id || (token as any)._id : null

  // Cleanup function for object URLs
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  // Fetch function
  const fetchImage = () => {
    if (!token) {
      setError('No token provided')
      return null
    }

    if (!fetchAttachment) {
      console.error('fetchAttachment not provided')
      setError('Attachment fetcher missing')
      return null
    }

    if (isLoading) {
      return null
    }

    setIsLoading(true)
    setError(null)
    setProgress(0)

    const fetcher = fetchAttachment(
      token,
      (progressValue: number) => setProgress(progressValue),
      (result: FetchAttachmentResult) => {
        setIsLoading(false)
        if (result.success && result.data) {
          try {
            const blob = toBlobFromUint8(result.data, 'image/jpeg')
            const url = URL.createObjectURL(blob)
            setImageUrl(url)
          } catch (err) {
            console.error('Error creating image blob:', err)
            setError('Failed to render image')
          }
        } else {
          // Only log as warning if it's a "deleted/missing" error which might be expected for old data
          if (result.error?.message.includes('deleted')) {
            console.warn(`[useImageAttachment] Image is missing or deleted: ${tokenId}`)
          } else {
            console.error('Image fetch failed:', result.error)
          }
          setError('Failed to load image')
        }
      },
    )

    return fetcher
  }

  // Auto-fetch on mount if enabled
  useEffect(() => {
    // If no token, clear the current state immediately
    if (!tokenId) {
      setImageUrl(null)
      setError(null)
      setProgress(0)
      setIsLoading(false)
      return
    }

    if (autoFetch && tokenId) {
      // Reset state when token changes
      setImageUrl(null)
      setError(null)
      setProgress(0)
      const fetcher = fetchImage()

      // Cleanup: Cancel the fetch if the component unmounts or token changes
      return () => {
        if (fetcher && typeof (fetcher as any).cancel === 'function') {
          try {
            ; (fetcher as any).cancel()
          } catch (e) {
            // Ignore cancel errors
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, fetchAttachment, autoFetch])

  return {
    imageUrl,
    progress,
    isLoading,
    error,
    fetchImage: () => {
      fetchImage()
    },
  }
}

// Utility function to convert various binary types into a Blob

function toBlobFromUint8(
  data: Uint8Array | ArrayBuffer | unknown,
  mime = 'image/jpeg',
): Blob {
  if (!data) {
    throw new Error('No data provided for blob conversion')
  }
  if (data instanceof Blob) {
    return data
  }
  if (data instanceof ArrayBuffer) {
    return new Blob([data], { type: mime })
  }
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    const copy = new Uint8Array(view.byteLength)
    copy.set(new Uint8Array(view.buffer, view.byteOffset || 0, view.byteLength))
    return new Blob([copy], { type: mime })
  }
  try {
    const ua = new Uint8Array(data as unknown as Uint8Array)
    return new Blob([ua], { type: mime })
  } catch {
    throw new Error('Unsupported data type for blob conversion')
  }
}
