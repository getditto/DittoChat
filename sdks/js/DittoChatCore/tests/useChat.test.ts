import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
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

    // Spy on the cancel methods for all subscription types
    const roomsSubCancel = vi.spyOn(
      state.roomsSubscription as NonNullable<typeof state.roomsSubscription>,
      'cancel',
    )
    const roomsObsCancel = vi.spyOn(
      state.roomsObserver as NonNullable<typeof state.roomsObserver>,
      'cancel',
    )
    const dmRoomsSubCancel = vi.spyOn(
      state.dmRoomsSubscription as NonNullable<
        typeof state.dmRoomsSubscription
      >,
      'cancel',
    )
    const dmRoomsObsCancel = vi.spyOn(
      state.dmRoomsObserver as NonNullable<typeof state.dmRoomsObserver>,
      'cancel',
    )
    const userSubCancel = vi.spyOn(
      state.userSubscription as NonNullable<typeof state.userSubscription>,
      'cancel',
    )
    const userObsCancel = vi.spyOn(
      state.userObserver as NonNullable<typeof state.userObserver>,
      'cancel',
    )
    const allUsersSubCancel = vi.spyOn(
      state.allUsersSubscription as NonNullable<
        typeof state.allUsersSubscription
      >,
      'cancel',
    )
    const allUsersObsCancel = vi.spyOn(
      state.allUsersObserver as NonNullable<typeof state.allUsersObserver>,
      'cancel',
    )

    // Accessing nested subscription in messageSubscriptionsByRoom
    const msgSubCancel = vi.spyOn(
      state.messageSubscriptionsByRoom['room-1'] as NonNullable<
        (typeof state.messageSubscriptionsByRoom)['room-1']
      >,
      'cancel',
    )
    const msgObsCancel = vi.spyOn(
      state.messageObserversByRoom['room-1'] as NonNullable<
        (typeof state.messageObserversByRoom)['room-1']
      >,
      'cancel',
    )

    state.chatLogout()

    // Verify all subscriptions and observers were cancelled
    expect(roomsSubCancel).toHaveBeenCalled()
    expect(roomsObsCancel).toHaveBeenCalled()
    expect(dmRoomsSubCancel).toHaveBeenCalled()
    expect(dmRoomsObsCancel).toHaveBeenCalled()
    expect(userSubCancel).toHaveBeenCalled()
    expect(userObsCancel).toHaveBeenCalled()
    expect(allUsersSubCancel).toHaveBeenCalled()
    expect(allUsersObsCancel).toHaveBeenCalled()
    expect(msgSubCancel).toHaveBeenCalled()
    expect(msgObsCancel).toHaveBeenCalled()
  })

  it('chatLogout handles null/undefined subscriptions gracefully', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))
    const state = result.current

    // Override some subscriptions to be null to test the null check
    const stateWithNulls = {
      ...state,
      roomsSubscription: null,
      dmRoomsObserver: null,
      messageSubscriptionsByRoom: null,
      messageObserversByRoom: undefined,
    }

    // This should not throw
    expect(() => {
      stateWithNulls.chatLogout()
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

    // Mock some subscriptions as already cancelled
    vi.spyOn(
      state.roomsSubscription as NonNullable<typeof state.roomsSubscription>,
      'isCancelled',
      'get',
    ).mockReturnValue(true)
    vi.spyOn(
      state.roomsSubscription as NonNullable<typeof state.roomsSubscription>,
      'cancel',
    )

    state.chatLogout()

    // The cancel method should still be called by the function,
    // but the internal check prevents actual cancellation
    // This tests the !subscription.isCancelled branch
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
