import { Ditto, StoreObserver, SyncSubscription } from "@dittolive/ditto";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice, DittoConfParams } from "../useChat";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";

export interface RoomSlice {
  rooms: Room[];
  dmRooms: Room[];
  roomsObserver: StoreObserver | null;
  roomsSubscription: SyncSubscription | null;
  dmRoomsObserver: StoreObserver | null;
  dmRoomsSubscription: SyncSubscription | null;
  createRoom: (name: string) => Promise<void | Room>;
  createDMRoom: (user: ChatUser) => Promise<void | Room>;
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

async function createRoomBase({
  ditto,
  chatUser,
  name,
  collectionId,
  messagesId,
  participants = [],
}: {
  ditto: Ditto | null;
  chatUser: ChatUser;
  name: string;
  collectionId: "rooms" | "dm_rooms";
  messagesId: "messages" | "dm_messages";
  participants?: string[];
}) {
  if (!ditto) return;

  try {
    const id = uuidv4();

    const room: Record<string, any> = {
      _id: id,
      name,
      messagesId,
      collectionId,
      isGenerated: false,
      createdBy: chatUser?._id,
      createdOn: new Date(),
      ...(participants.length ? { participants } : {}),
    };

    const query = `INSERT INTO \`${collectionId}\` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`;
    await ditto.store.execute(query, { newDoc: room });

    return room as Room;
  } catch (error) {
    console.error(`Error creating ${collectionId}:`, error);
  }
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

    createRoom(name: string) {
      const chatUser = _get().chatUser;
      return createRoomBase({
        ditto,
        chatUser,
        name,
        collectionId: "rooms",
        messagesId: "messages",
      });
    },

    createDMRoom(dmUser: ChatUser) {
      const chatUser = _get().chatUser;
      return createRoomBase({
        ditto,
        chatUser,
        name: `${chatUser?.name} & ${dmUser.name}`,
        collectionId: "dm_rooms",
        messagesId: "dm_messages",
        participants: [chatUser?._id, dmUser._id],
      });
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
