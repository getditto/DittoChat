import { StoreObserver, SyncSubscription } from "@dittolive/ditto";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { CreateSlice, DittoConfParams } from "../useChat";

export interface RoomSlice {
  rooms: Room[];
  roomsObserver: StoreObserver | null;
  roomsSubscription: SyncSubscription | null;
  roomMessageSubscriptionsMap?: Record<string, SyncSubscription>;
  subscribeRoomMessages: (room: Room) => Promise<void>;
  createRoom: (name: string) => Promise<void>;
}

export const createRoomSlice: CreateSlice<RoomSlice> = (
  _set,
  _get,
  { ditto, userId }: DittoConfParams,
) => {
  const store: RoomSlice = {
    rooms: [],
    roomsObserver: null,
    roomsSubscription: null,
    roomMessageSubscriptionsMap: {},
    subscribeRoomMessages: async (room: Room) => {
      const roomMessageSubscriptionsMap = _get().roomMessageSubscriptionsMap;
      if (!ditto) return Promise.resolve();
      if (roomMessageSubscriptionsMap[room._id]) return Promise.resolve();
      const query = `SELECT * FROM ${room.messagesId} WHERE room_id = :id`;
      const subscription = ditto.sync.registerSubscription(query, {
        id: room._id,
      });
      _set({
        roomMessageSubscriptionsMap: {
          ...roomMessageSubscriptionsMap,
          [room._id]: subscription,
        },
      });
    },
    createRoom: async (name: string) => {
      if (!ditto) return Promise.resolve();
      try {
        const chatUser = _get().chatUser;
        const room = {
          name: name,
          messagesId: "messages",
          collectionId: "rooms",
          isGenerated: false,
          createdBy: chatUser?._id,
          createdOn: new Date(),
        } as Record<string, any>;

        let query =
          "INSERT INTO `rooms` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE";

        await ditto.store.execute(query, { newDoc: room });
      } catch (error) {
        console.error("Error creating room:", error);
      }
    },
  };

  if (ditto) {
    const roomsQuery = `SELECT * FROM rooms`;
    store.roomsSubscription = ditto.sync.registerSubscription(roomsQuery);
    store.roomsObserver = ditto.store.registerObserver(roomsQuery, (result) => {
      _set({ rooms: result.items.map((doc) => doc.value as Room) });
    });
  }
  return store;
};
