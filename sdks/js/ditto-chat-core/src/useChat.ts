import { Ditto, StoreObserver, SyncSubscription } from '@dittolive/ditto'
import { useMemo } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { createStore, StoreApi } from 'zustand/vanilla'

import { ChatUserSlice, createChatUserSlice } from './slices/useChatUser'
import { createMessageSlice, MessageSlice } from './slices/useMessages'
import { createRBACSlice, RBACSlice } from './slices/useRBAC'
import { createRoomSlice, RoomSlice } from './slices/useRooms'
import { RBACConfig } from './types/RBAC'

export type DittoConfParams = {
  ditto: Ditto | null
  userId: string
  userCollectionKey: string
  retentionDays?: number
  rbacConfig?: RBACConfig
  notificationHandler?: (title: string, description: string) => void
}

export type CreateSlice<T> = (
  set: StoreApi<ChatStore>['setState'],
  get: StoreApi<ChatStore>['getState'],
  params: DittoConfParams,
) => T

export type ChatStore = RoomSlice &
  ChatUserSlice &
  MessageSlice &
  RBACSlice & {
    activeRoomId: string | number | null
    setActiveRoomId: (roomId: string | number | null) => void
    chatLogout: () => void
  }

export let chatStore: StoreApi<ChatStore> | null = null
export let chatStoreSub: (() => void) | undefined

function cancelSubscriptionOrObserver(
  subscription: SyncSubscription | StoreObserver | null,
) {
  if (subscription && !subscription.isCancelled) {
    subscription.cancel()
  }
}

export function useDittoChat(params: DittoConfParams) {
  const store = useMemo(() => {
    if (!chatStore) {
      chatStore = createStore<ChatStore>()((set, get) => ({
        ...createRoomSlice(set, get, params),
        ...createChatUserSlice(set, get, params),
        ...createMessageSlice(set, get, params),
        ...createRBACSlice(set, get, params),
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
      }))
    }
    return chatStore
  }, [params])

  return useStore(store!)
}

export function useDittoChatStore<T = Partial<ChatStore>>(
  selector?: (state: ChatStore) => T,
) {
  if (!chatStore) {
    throw new Error(
      'chatStore must be initialized before useDittoChatStore. use useDittoChat for initialization',
    )
  }

  const shallowSelector = useShallow(
    selector || ((state: ChatStore) => state as T),
  )
  const storeValue = useStore(chatStore, shallowSelector)

  return storeValue
}
