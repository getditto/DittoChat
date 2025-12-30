import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useImageAttachment } from '../../hooks/useImageAttachment'
import { AttachmentToken } from '@dittolive/ditto'

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('useImageAttachment', () => {
  const mockToken = {
    id: 'attachment-1',
    len: 0,
    metadata: {},
  } as unknown as AttachmentToken

  const mockFetchAttachment = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useImageAttachment({ token: null, fetchAttachment: mockFetchAttachment }),
    )

    expect(result.current.imageUrl).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches image automatically on mount', async () => {
    mockFetchAttachment.mockImplementation(
      (_token, _onProgress, onComplete) => {
        setTimeout(() => {
          onComplete({ success: true, data: new Uint8Array([1, 2, 3]) })
        }, 10)
      },
    )

    const { result } = renderHook(() =>
      useImageAttachment({
        token: mockToken,
        fetchAttachment: mockFetchAttachment,
      }),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.imageUrl).toBe('blob:mock-url')
    expect(mockFetchAttachment).toHaveBeenCalledWith(
      mockToken,
      expect.any(Function),
      expect.any(Function),
    )
  })

  it('handles fetch error', async () => {
    mockFetchAttachment.mockImplementation(
      (_token, _onProgress, onComplete) => {
        onComplete({ success: false, error: new Error('Fetch failed') })
      },
    )

    const { result } = renderHook(() =>
      useImageAttachment({
        token: mockToken,
        fetchAttachment: mockFetchAttachment,
      }),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load image')
    expect(result.current.imageUrl).toBeNull()
  })

  it('updates progress', async () => {
    mockFetchAttachment.mockImplementation((_token, onProgress, onComplete) => {
      onProgress(0.5)
      setTimeout(() => {
        onComplete({ success: true, data: new Uint8Array([]) })
      }, 100)
    })

    const { result } = renderHook(() =>
      useImageAttachment({
        token: mockToken,
        fetchAttachment: mockFetchAttachment,
      }),
    )

    await waitFor(() => {
      expect(result.current.progress).toBe(0.5)
    })

    // Wait for the async operation to complete before test ends
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('handles missing fetch function', () => {
    const { result } = renderHook(() =>
      useImageAttachment({ token: mockToken, fetchAttachment: undefined }),
    )
    expect(result.current.isLoading).toBe(false)
  })

  it('handles blob creation failure', async () => {
    vi.mocked(global.URL.createObjectURL).mockImplementationOnce(() => {
      throw new Error('Blob failed')
    })

    mockFetchAttachment.mockImplementation(
      (_token, _onProgress, onComplete) => {
        onComplete({ success: true, data: new Uint8Array([]) })
      },
    )

    const { result } = renderHook(() =>
      useImageAttachment({
        token: mockToken,
        fetchAttachment: mockFetchAttachment,
      }),
    )

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to render image')
    })
  })

  it('handles missing token', () => {
    const { result } = renderHook(() =>
      useImageAttachment({ token: null, fetchAttachment: mockFetchAttachment }),
    )

    act(() => {
      result.current.fetchImage()
    })

    expect(result.current.error).toBe('No token provided')
  })

  it('prevents duplicate fetch when already loading', async () => {
    mockFetchAttachment.mockImplementation(() => { })

    const { result } = renderHook(() =>
      useImageAttachment({
        token: mockToken,
        fetchAttachment: mockFetchAttachment,
      }),
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.fetchImage()
    })

    expect(result.current.isLoading).toBe(true)
    expect(mockFetchAttachment).toHaveBeenCalledTimes(1)
  })
  it('retries on failure and eventually succeeds', async () => {
    let attempts = 0
    mockFetchAttachment.mockImplementation(
      (_token, _onProgress, onComplete) => {
        attempts++
        if (attempts < 3) {
          onComplete({ success: false, error: new Error('Transient error') })
        } else {
          onComplete({ success: true, data: new Uint8Array([1, 2, 3]) })
        }
      },
    )

    const { result } = renderHook(() =>
      useImageAttachment({
        token: mockToken,
        fetchAttachment: mockFetchAttachment,
        retryDelay: 10, // Fast retries for testing
      }),
    )

    // Wait for the final successful result
    await waitFor(() => {
      expect(result.current.imageUrl).toBe('blob:mock-url')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    }, { timeout: 2000 })

    expect(mockFetchAttachment).toHaveBeenCalledTimes(3)
  })
})
