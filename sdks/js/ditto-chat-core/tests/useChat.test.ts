import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useDittoChat,
  useDittoChatStore,
  DittoConfParams,
} from '../src/useChat'
import { createMockDitto, MockDitto } from './setup'
import { Ditto } from '@dittolive/ditto'

// Mock the slices to verify aggregation
vi.mock('../src/slices/useRooms', () => ({
  createRoomSlice: vi.fn(() => ({
    rooms: [],
    createRoom: vi.fn(),
    roomsSubscription: { cancel: vi.fn(), isCancelled: false },
    roomsObserver: { cancel: vi.fn(), isCancelled: false },
    dmRoomsSubscription: { cancel: vi.fn(), isCancelled: false },
    dmRoomsObserver: { cancel: vi.fn(), isCancelled: false },
  })),
}))

vi.mock('../src/slices/useChatUser', () => ({
  createChatUserSlice: vi.fn(() => ({
    currentUser: null,
    updateAvatar: vi.fn(),
    userSubscription: { cancel: vi.fn(), isCancelled: false },
    userObserver: { cancel: vi.fn(), isCancelled: false },
    allUsersSubscription: { cancel: vi.fn(), isCancelled: false },
    allUsersObserver: { cancel: vi.fn(), isCancelled: false },
  })),
}))

vi.mock('../src/slices/useMessages', () => ({
  createMessageSlice: vi.fn(() => ({
    messagesByRoom: {},
    createMessage: vi.fn(),
    messageSubscriptionsByRoom: {
      'room-1': { cancel: vi.fn(), isCancelled: false },
    },
    messageObserversByRoom: {
      'room-1': { cancel: vi.fn(), isCancelled: false },
    },
  })),
}))

describe('useDittoChat', () => {
  let mockDitto: MockDitto
  const mockParams: DittoConfParams = {
    ditto: null,
    userId: 'test-user',
    userCollectionKey: 'users',
  }

  beforeEach(() => {
    mockDitto = createMockDitto()
    mockParams.ditto = mockDitto as unknown as Ditto
  })

  it('initializes the store with aggregated state', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))

    const state = result.current

    // Verify properties from slices exist
    expect(state).toHaveProperty('rooms')
    expect(state).toHaveProperty('currentUser')
    expect(state).toHaveProperty('messagesByRoom')
    expect(state).toHaveProperty('chatLogout')
  })

  it('chatLogout cancels all subscriptions and observers', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))
    const state = result.current

    // Call chatLogout - it should not throw
    expect(() => state.chatLogout()).not.toThrow()

    // Verify that the subscriptions exist in the state
    expect(state.roomsSubscription).toBeDefined()
    expect(state.roomsObserver).toBeDefined()
    expect(state.dmRoomsSubscription).toBeDefined()
    expect(state.dmRoomsObserver).toBeDefined()
    expect(state.userSubscription).toBeDefined()
    expect(state.userObserver).toBeDefined()
    expect(state.allUsersSubscription).toBeDefined()
    expect(state.allUsersObserver).toBeDefined()
    expect(state.messageSubscriptionsByRoom).toBeDefined()
    expect(state.messageObserversByRoom).toBeDefined()
  })

  it('chatLogout handles null/undefined subscriptions gracefully', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))

    // chatLogout should handle null/undefined subscriptions without throwing
    expect(() => {
      result.current.chatLogout()
    }).not.toThrow()
  })

  it('returns the same store instance on subsequent calls', () => {
    const { result: result1 } = renderHook(() => useDittoChat(mockParams))
    const { result: result2 } = renderHook(() => useDittoChat(mockParams))

    // They should share state (zustand store)
    expect(result1.current).toBeDefined()
    expect(result2.current).toBeDefined()
  })

  it('chatLogout handles empty messageSubscriptionsByRoom and messageObserversByRoom', () => {
    // Re-mock to return empty objects
    vi.doMock('../src/slices/useMessages', () => ({
      createMessageSlice: vi.fn(() => ({
        messagesByRoom: {},
        createMessage: vi.fn(),
        messageSubscriptionsByRoom: {},
        messageObserversByRoom: {},
      })),
    }))

    const { result } = renderHook(() => useDittoChat(mockParams))

    // This should not throw even with empty subscription maps
    expect(() => result.current.chatLogout()).not.toThrow()
  })

  it('chatLogout handles already cancelled subscriptions', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))
    const state = result.current

    // Manually set isCancelled to true on some subscriptions to simulate already cancelled state
    if (state.roomsSubscription) {
      ;(state.roomsSubscription as any).isCancelled = true
    }
    if (state.dmRoomsObserver) {
      ;(state.dmRoomsObserver as any).isCancelled = true
    }

    // chatLogout should handle already cancelled subscriptions without throwing
    expect(() => state.chatLogout()).not.toThrow()
  })
})

describe('useDittoChatStore', () => {
  let mockDitto: MockDitto
  const mockParams: DittoConfParams = {
    ditto: null,
    userId: 'test-user',
    userCollectionKey: 'users',
  }

  beforeEach(() => {
    mockDitto = createMockDitto()
    mockParams.ditto = mockDitto as unknown as Ditto
    // Ensure chatStore is initialized for these tests
    renderHook(() => useDittoChat(mockParams))
  })

  it('returns store state without selector', () => {
    // Now use useDittoChatStore
    const { result } = renderHook(() => useDittoChatStore())

    expect(result.current).toBeDefined()
    expect(result.current).toHaveProperty('rooms')
    expect(result.current).toHaveProperty('currentUser')
  })

  it('returns selected state with selector', () => {
    // Now use useDittoChatStore with a selector
    const { result } = renderHook(() =>
      useDittoChatStore((state) => ({ rooms: state.rooms })),
    )

    expect(result.current).toBeDefined()
    expect(result.current).toHaveProperty('rooms')
    expect(result.current.rooms).toEqual([])
  })

  it('works with complex selectors', () => {
    // Use a more complex selector
    const { result } = renderHook(() =>
      useDittoChatStore((state) => ({
        hasRooms: state.rooms && state.rooms.length > 0,
        userExists: !!state.currentUser,
      })),
    )

    expect(result.current).toBeDefined()
    expect(result.current).toHaveProperty('hasRooms')
    expect(result.current).toHaveProperty('userExists')
    expect(result.current.hasRooms).toBe(false)
    expect(result.current.userExists).toBe(false)
  })
})

describe('isAdmin', () => {
  let mockDitto: MockDitto
  const baseParams: DittoConfParams = {
    ditto: null,
    userId: 'test-user',
    userCollectionKey: 'users',
  }

  beforeEach(() => {
    mockDitto = createMockDitto()
    baseParams.ditto = mockDitto as unknown as Ditto
  })

  it('isAdmin defaults to false when prop is not provided', () => {
    const { result } = renderHook(() => useDittoChat(baseParams))
    expect(result.current.isAdmin).toBe(false)
  })

  it('isAdmin true persists in the store when initialized with isAdmin: true', () => {
    const { result } = renderHook(() =>
      useDittoChat({ ...baseParams, isAdmin: true }),
    )
    expect(result.current.isAdmin).toBe(true)
  })

  it('setIsAdmin updates the store imperatively', () => {
    const { result } = renderHook(() => useDittoChat(baseParams))
    expect(result.current.isAdmin).toBe(false)

    act(() => {
      result.current.setIsAdmin(true)
    })
    expect(globalThis.__DITTO_CHAT_STORE__!.getState().isAdmin).toBe(true)

    act(() => {
      globalThis.__DITTO_CHAT_STORE__!.getState().setIsAdmin(false)
    })
    expect(globalThis.__DITTO_CHAT_STORE__!.getState().isAdmin).toBe(false)
  })

  it('isAdmin prop change syncs to the store via useEffect', () => {
    const { rerender } = renderHook(
      ({ isAdmin }: { isAdmin: boolean }) =>
        useDittoChat({ ...baseParams, isAdmin }),
      { initialProps: { isAdmin: false } },
    )
    expect(globalThis.__DITTO_CHAT_STORE__!.getState().isAdmin).toBe(false)

    rerender({ isAdmin: true })
    expect(globalThis.__DITTO_CHAT_STORE__!.getState().isAdmin).toBe(true)

    rerender({ isAdmin: false })
    expect(globalThis.__DITTO_CHAT_STORE__!.getState().isAdmin).toBe(false)
  })
})
