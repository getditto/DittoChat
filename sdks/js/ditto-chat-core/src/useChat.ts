import {
  AttachmentToken,
  Ditto,
  StoreObserver,
  SyncSubscription,
} from '@dittolive/ditto'
import { useEffect, useMemo } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore, StoreApi } from 'zustand/vanilla'

import { ChatUserSlice, createChatUserSlice } from './slices/useChatUser'
import {
  AttachmentResult,
  createMessageSlice,
  MessageSlice,
} from './slices/useMessages'
import { createRoomSlice, RoomSlice } from './slices/useRooms'
import type { RetentionConfig } from './types/Retention'

export type DittoConfParams = {
  ditto: Ditto | null
  userId: string
  userCollectionKey: string
  retention?: RetentionConfig
  isAdmin?: boolean
  notificationHandler?: (title: string, description: string) => void
}

export type CreateSlice<T> = (
  set: StoreApi<ChatStore>['setState'],
  get: StoreApi<ChatStore>['getState'],
  params: DittoConfParams,
) => T

export type ChatStore = RoomSlice &
  ChatUserSlice &
  MessageSlice & {
    isAdmin: boolean
    setIsAdmin: (isAdmin: boolean) => void
    activeRoomId: string | number | null
    fetchAttachment: (
      token: AttachmentToken,
      onProgress: (progress: number) => void,
      onComplete: (result: AttachmentResult) => void,
    ) => unknown
    setActiveRoomId: (roomId: string | number | null) => void
    chatLogout: () => void
  }

// Use globalThis to ensure a single store instance across all npm packages
declare global {
  var __DITTO_CHAT_STORE__: StoreApi<ChatStore> | undefined
}

export function cancelSubscriptionOrObserver(
  subscription: SyncSubscription | StoreObserver | null,
) {
  if (subscription && !subscription.isCancelled) {
    subscription.cancel()
  }
}

export function useDittoChat(params: DittoConfParams) {
  const store = useMemo(() => {
    // Check global instance first
    if (!globalThis.__DITTO_CHAT_STORE__) {
      globalThis.__DITTO_CHAT_STORE__ = createStore<ChatStore>()(
        (set, get) => ({
          ...createRoomSlice(set, get, params),
          ...createChatUserSlice(set, get, params),
          ...createMessageSlice(set, get, params),
          isAdmin: params.isAdmin ?? false,
          setIsAdmin: (isAdmin: boolean) => set({ isAdmin }),
          activeRoomId: null,
          setActiveRoomId: (roomId) => set({ activeRoomId: roomId }),
          chatLogout: () => {
            const state = get()
            cancelSubscriptionOrObserver(state.roomsSubscription)
            cancelSubscriptionOrObserver(state.roomsObserver)
            cancelSubscriptionOrObserver(state.dmRoomsSubscription)
            cancelSubscriptionOrObserver(state.dmRoomsObserver)
            Object.values(state.messageSubscriptionsByRoom || {}).map((sub) =>
              cancelSubscriptionOrObserver(sub),
            )
            Object.values(state.messageObserversByRoom || {}).map((sub) =>
              cancelSubscriptionOrObserver(sub),
            )
            cancelSubscriptionOrObserver(state.userObserver)
            cancelSubscriptionOrObserver(state.userSubscription)
            cancelSubscriptionOrObserver(state.allUsersObserver)
            cancelSubscriptionOrObserver(state.allUsersSubscription)
          },
        }),
      )
    }
    return globalThis.__DITTO_CHAT_STORE__
  }, [params])

  // Sync the declarative `isAdmin` prop into the store so consumers can update
  // a user's admin status by changing the prop without rebuilding the chat.
  useEffect(() => {
    store.getState().setIsAdmin(params.isAdmin ?? false)
  }, [store, params.isAdmin])

  return useStore(store)
}

export function useDittoChatStore<T = Partial<ChatStore>>(
  selector?: (state: ChatStore) => T,
) {
  if (!globalThis.__DITTO_CHAT_STORE__) {
    throw new Error(
      'chatStore must be initialized before useDittoChatStore. use useDittoChat for initialization',
    )
  }

  const shallowSelector = useShallow(
    selector || ((state: ChatStore) => state as T),
  )
  const storeValue = useStore(globalThis.__DITTO_CHAT_STORE__, shallowSelector)

  return storeValue
}

/**
 * Get the global chat store instance
 * Useful for debugging or accessing the store outside of React components
 */
export function getChatStore() {
  return globalThis.__DITTO_CHAT_STORE__
}

/**
 * Reset the global chat store
 * Useful for testing or when you need to completely reinitialize
 */
export function resetChatStore() {
  globalThis.__DITTO_CHAT_STORE__ = undefined
}
