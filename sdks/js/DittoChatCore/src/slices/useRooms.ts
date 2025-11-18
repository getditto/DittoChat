import {
  Ditto,
  QueryResult,
  StoreObserver,
  SyncSubscription,
} from "@dittolive/ditto";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice, DittoConfParams } from "../useChat";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";
import { StoreApi } from "zustand";

export interface RoomSlice {
  rooms: Room[];
  dmRooms: Room[];
  roomsLoading: boolean;
  roomsObserver: StoreObserver | null;
  roomsSubscription: SyncSubscription | null;
  dmRoomsObserver: StoreObserver | null;
  dmRoomsSubscription: SyncSubscription | null;
  createRoom: (name: string) => Promise<void | Room>;
  createDMRoom: (user: ChatUser) => Promise<void | Room>;
}

function handleRoomsObserverResult(
  _set: StoreApi<ChatStore>["setState"],
  _get: StoreApi<ChatStore>["getState"],
  observerResult: QueryResult<Room>,
) {
  if (observerResult.items.length === 0) return;
  const rooms = observerResult.items.map((doc) => {
    const messagePublisher = _get().messagesPublisher;
    messagePublisher(doc.value);
    return doc.value;
  });
  _set((state: ChatStore) => {
    return produce(state, (draft) => {
      const otherRooms = state.rooms.filter(
        (room) => room.collectionId !== rooms[0].collectionId,
      );
      draft.rooms = otherRooms.concat(rooms);
      draft.roomsLoading = false;
      return draft;
    });
  });
}

async function createRoomBase({
  ditto,
  currentUserId,
  name,
  collectionId,
  messagesId,
  participants = [],
}: {
  ditto: Ditto | null;
  currentUserId: string;
  name: string;
  collectionId: "rooms" | "dm_rooms";
  messagesId: "messages" | "dm_messages";
  participants?: string[];
}) {
  if (!ditto) return;

  try {
    const id = uuidv4();

    const room = {
      _id: id,
      name,
      messagesId,
      collectionId,
      isGenerated: false,
      createdBy: currentUserId,
      createdOn: new Date().toISOString(),
      participants: participants || undefined,
    };

    const query = `INSERT INTO \`${collectionId}\` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`;
    await ditto.store.execute(query, { newDoc: room });

    return room;
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
    roomsLoading: true,
    roomsObserver: null,
    roomsSubscription: null,
    dmRoomsObserver: null,
    dmRoomsSubscription: null,

    createRoom(name: string) {
      const currentUser = _get().currentUser;
      return createRoomBase({
        ditto,
        currentUserId: currentUser?._id || userId,
        name,
        collectionId: "rooms",
        messagesId: "messages",
      });
    },

    createDMRoom(dmUser: ChatUser) {
      const currentUser = _get().currentUser;
      if (!currentUser?._id || !dmUser?._id) throw Error("Invalid users");
      return createRoomBase({
        ditto,
        currentUserId: currentUser?._id || userId,
        name: `${currentUser?.name} & ${dmUser.name}`,
        collectionId: "dm_rooms",
        messagesId: "dm_messages",
        participants: [currentUser?._id, dmUser._id],
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
    store.roomsObserver = ditto.store.registerObserver<Room>(
      roomsQuery,
      (result) => {
        handleRoomsObserverResult(_set, _get, result);
      },
    );
    store.dmRoomsObserver = ditto.store.registerObserver<Room>(
      dmRoomsQuery,
      (result) => {
        handleRoomsObserverResult(_set, _get, result);
      },
      {
        userId,
      },
    );
  }
  return store;
};
