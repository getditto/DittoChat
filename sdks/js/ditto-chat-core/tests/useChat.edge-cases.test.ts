import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDittoChat } from '../src/useChat'
import { createMockDitto, MockDitto } from './setup'
import { DittoConfParams } from '../src/useChat'
import { Ditto } from '@dittolive/ditto'

// Mock the slices to return null/undefined for message subscriptions
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

// THIS IS THE KEY: Mock with null/undefined to trigger the || {} branches
vi.mock('../src/slices/useMessages', () => ({
  createMessageSlice: vi.fn(() => ({
    messagesByRoom: {},
    createMessage: vi.fn(),
    // These are null/undefined to trigger the fallback branches
    messageSubscriptionsByRoom: null,
    messageObserversByRoom: undefined,
  })),
}))

describe('useDittoChat - Edge Cases with Null Subscriptions', () => {
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

  it('chatLogout handles null messageSubscriptionsByRoom (triggers || {} branch)', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))
    const state = result.current

    // Verify that messageSubscriptionsByRoom is null
    expect(state.messageSubscriptionsByRoom).toBeNull()

    // This should not throw and should use the || {} fallback
    expect(() => state.chatLogout()).not.toThrow()
  })

  it('chatLogout handles undefined messageObserversByRoom (triggers || {} branch)', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))
    const state = result.current

    // Verify that messageObserversByRoom is undefined
    expect(state.messageObserversByRoom).toBeUndefined()

    // This should not throw and should use the || {} fallback
    expect(() => state.chatLogout()).not.toThrow()
  })

  it('chatLogout works correctly with both null and undefined subscription maps', () => {
    const { result } = renderHook(() => useDittoChat(mockParams))

    // Call chatLogout multiple times to ensure it's stable
    expect(() => {
      result.current.chatLogout()
      result.current.chatLogout()
    }).not.toThrow()
  })
})
