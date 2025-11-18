import { Ditto } from "@dittolive/ditto";
import { useStore } from "zustand";
import { createStore, StoreApi } from "zustand/vanilla";
import { useShallow } from "zustand/react/shallow";
import { createRoomSlice, RoomSlice } from "./slices/useRooms";
import { useMemo } from "react";
import { ChatUserSlice, createChatUserSlice } from "./slices/useChatUser";
import { MessageSlice, createMessageSlice } from "./slices/useMessages";

export type DittoConfParams = {
  ditto: Ditto | null;
  userId: string;
  userCollectionKey: string;
  retentionDays?: number;
};

export type CreateSlice<T> = (
  set: StoreApi<ChatStore>["setState"],
  get: StoreApi<ChatStore>["getState"],
  params: DittoConfParams,
) => T;

export type ChatStore = RoomSlice & ChatUserSlice & MessageSlice;

export let chatStore: StoreApi<ChatStore> | null = null;
export let chatStoreSub: Function;

export function useDittoChat(params: DittoConfParams) {
  const store = useMemo(() => {
    if (!chatStore) {
      chatStore = createStore<ChatStore>()((set, get) => ({
        ...createRoomSlice(set, get, params),
        ...createChatUserSlice(set, get, params),
        ...createMessageSlice(set, get, params),
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
  if (selector) return useStore(chatStore, useShallow(selector));
  return useStore(chatStore) as T;
}
