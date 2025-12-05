import { Ditto, StoreObserver, SyncSubscription } from "@dittolive/ditto";
import { useStore } from "zustand";
import { createStore, StoreApi } from "zustand/vanilla";
import { useShallow } from "zustand/react/shallow";
import { createRoomSlice, RoomSlice } from "./slices/useRooms";
import { useMemo } from "react";
import { ChatUserSlice, createChatUserSlice } from "./slices/useChatUser";
import { MessageSlice, createMessageSlice } from "./slices/useMessages";
import { RBACSlice, createRBACSlice } from "./slices/useRBAC";
import { RBACConfig } from "./types/RBAC";

export type DittoConfParams = {
  ditto: Ditto | null;
  userId: string;
  userCollectionKey: string;
  retentionDays?: number;
  rbacConfig?: RBACConfig;
  notificationHandler?: (title: string, description: string) => void;
};

export type CreateSlice<T> = (
  set: StoreApi<ChatStore>["setState"],
  get: StoreApi<ChatStore>["getState"],
  params: DittoConfParams,
) => T;

export type ChatStore = RoomSlice &
  ChatUserSlice &
  MessageSlice &
  RBACSlice & {
    activeRoomId: string | number | null;
    setActiveRoomId: (roomId: string | number | null) => void;
    chatLogout: () => void;
  };

export let chatStore: StoreApi<ChatStore> | null = null;
export let chatStoreSub: (() => void) | undefined;

function cancelSubscriptionOrObserver(
  subscription: SyncSubscription | StoreObserver | null,
) {
  if (subscription && !subscription.isCancelled) {
    subscription.cancel();
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
          const state = get();
          cancelSubscriptionOrObserver(state.roomsSubscription);
          cancelSubscriptionOrObserver(state.roomsObserver);
          cancelSubscriptionOrObserver(state.dmRoomsSubscription);
          cancelSubscriptionOrObserver(state.dmRoomsObserver);
          Object.values(state.messageSubscriptionsByRoom || {}).map((sub) =>
            cancelSubscriptionOrObserver(sub),
          );
          Object.values(state.messageObserversByRoom || {}).map((sub) =>
            cancelSubscriptionOrObserver(sub),
          );
          cancelSubscriptionOrObserver(state.userObserver);
          cancelSubscriptionOrObserver(state.userSubscription);
          cancelSubscriptionOrObserver(state.allUsersObserver);
          cancelSubscriptionOrObserver(state.allUsersSubscription);
        },
      }));
    }
    return chatStore;
  }, [params.ditto]);

  return useStore(store!);
}

export function useDittoChatStore<T = Partial<ChatStore>>(
  selector?: (state: ChatStore) => T,
) {
  if (!chatStore) {
    throw new Error(
      "chatStore must be initialized before useDittoChatStore. use useDittoChat for initialization",
    );
  }
  if (selector) { return useStore(chatStore, useShallow(selector)); }
  return useStore(chatStore) as T;
}
