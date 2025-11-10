import { StoreObserver, SyncSubscription } from "@dittolive/ditto";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice, DittoConfParams } from "../useChat";
import { produce } from "immer";

export interface RoomSlice {
  rooms: Room[];
  dmRooms: Room[];
  roomsObserver: StoreObserver | null;
  roomsSubscription: SyncSubscription | null;
  dmRoomsObserver: StoreObserver | null;
  dmRoomsSubscription: SyncSubscription | null;
  createRoom: (name: string) => Promise<void>;
  createDMRoom: (user: ChatUser) => Promise<any>;
}

function saveRoomsToStore(_set: any, rooms: Room[]) {
  if (rooms.length === 0) return;
  _set((state: ChatStore) => {
    return produce(state, (draft) => {
      const otherRooms = state.rooms.filter(
        (room) => room.collectionId !== rooms[0].collectionId,
      );
      draft.rooms = otherRooms.concat(rooms);
      return draft;
    });
  });
}

export const createRoomSlice: CreateSlice<RoomSlice> = (
  _set,
  _get,
  { ditto, userId }: DittoConfParams,
) => {
  const store: RoomSlice = {
    rooms: [],
    dmRooms: [],
    roomsObserver: null,
    roomsSubscription: null,
    dmRoomsObserver: null,
    dmRoomsSubscription: null,
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

    createDMRoom: async (dmUser: ChatUser) => {
      if (!ditto) return Promise.resolve();
      try {
        const chatUser = _get().chatUser;
        const room = {
          name: `${chatUser?.name} & ${dmUser.name}`,
          messagesId: "dm_messages",
          collectionId: "dm_rooms",
          isGenerated: false,
          createdBy: chatUser?._id,
          createdOn: new Date(),
          participants: [chatUser?._id, dmUser._id],
        } as Record<string, any>;

        let query =
          "INSERT INTO `dm_rooms` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE";

        const result = await ditto.store.execute(query, { newDoc: room });
        console.log("new room created", result);
        return result;
      } catch (error) {
        console.error("Error creating room:", error);
      }
    },
  };

  if (ditto) {
    const roomsQuery = `SELECT * from rooms`;
    const dmRoomsQuery = `SELECT * from dm_rooms where (array_contains(participants, :userId))`;
    store.roomsSubscription = ditto.sync.registerSubscription(roomsQuery);
    store.dmRoomsSubscription = ditto.sync.registerSubscription(dmRoomsQuery, {
      userId,
    });
    store.roomsObserver = ditto.store.registerObserver(roomsQuery, (result) => {
      saveRoomsToStore(
        _set,
        result.items.map((doc) => doc.value as Room),
      );
    });
    store.dmRoomsObserver = ditto.store.registerObserver(
      dmRoomsQuery,
      (result) => {
        saveRoomsToStore(
          _set,
          result.items.map((doc) => doc.value as Room),
        );
      },
      {
        userId,
      },
    );
  }
  return store;
};
