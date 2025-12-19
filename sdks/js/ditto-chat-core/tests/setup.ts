import { vi, afterEach } from 'vitest'
import { Ditto } from '@dittolive/ditto'
import { createStore } from 'zustand'
import { createRoomSlice } from '../src/slices/useRooms'
import { createChatUserSlice } from '../src/slices/useChatUser'
import { createMessageSlice } from '../src/slices/useMessages'
import { createRBACSlice } from '../src/slices/useRBAC'
import { ChatStore, resetChatStore } from '../src/useChat'

// Reset the global store between tests for proper test isolation
afterEach(() => {
  resetChatStore()
})

// Type for the mock Ditto instance used in tests
export type MockDitto = ReturnType<typeof createMockDitto>

// Mock Blob.arrayBuffer
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function () {
    // simple mock buffer
    return new ArrayBuffer(0)
  }
}

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === '2d') {
    return {
      drawImage: vi.fn(),
    }
  }
  return null
}) as unknown as typeof HTMLCanvasElement.prototype.getContext

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock-image-data'], { type: 'image/jpeg' }))
})

// Mock FileReader
global.FileReader = class {
  readAsDataURL() {
    // @ts-expect-error - Mock onload without proper event type
    this.onload({ target: { result: 'data:image/png;base64,fake-data' } })
  }
  onload() {}
  onerror() {}
} as unknown as typeof FileReader

// Mock Image
global.Image = class {
  width = 100
  height = 100
  constructor() {
    setTimeout(() => {
      this.onload()
    }, 10)
  }
  onload() {}
  onerror() {}
} as unknown as typeof Image

export const createMockDitto = () => ({
  store: {
    execute: vi.fn().mockResolvedValue({ items: [] }),
    registerObserver: vi
      .fn()
      .mockReturnValue({ stop: vi.fn(), cancel: vi.fn() }),
    newAttachment: vi.fn().mockResolvedValue({
      id: 'mock-attachment-token',
      len: 100,
      metadata: {},
    }),
    fetchAttachment: vi.fn(),
  },
  sync: {
    registerSubscription: vi.fn().mockReturnValue({ cancel: vi.fn() }),
  },
})

export const createTestStore = (mockDitto: MockDitto | null) => {
  const params = {
    ditto: mockDitto as unknown as Ditto, // Cast needed for mock compatibility with Ditto type
    userId: 'test-user-id',
    userCollectionKey: 'users',
  }

  return createStore<ChatStore>(
    (set, get) =>
      ({
        ...createRoomSlice(set, get, params),
        ...createChatUserSlice(set, get, params),
        ...createMessageSlice(set, get, params),
        ...createRBACSlice(set, get, params),
        activeRoomId: null,
        setActiveRoomId: (roomId: string | number | null) =>
          set({ activeRoomId: roomId }),
        chatLogout: vi.fn(), // Mock implementation for tests
      }) as any,
  )
}
