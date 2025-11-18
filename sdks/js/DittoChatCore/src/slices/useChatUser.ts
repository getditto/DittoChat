import { StoreObserver, SyncSubscription } from "@dittolive/ditto";
import ChatUser from "../types/ChatUser";
import { CreateSlice, DittoConfParams } from "../useChat";

export interface ChatUserSlice {
  usersLoading: boolean;
  currentUser: ChatUser | null;
  userObserver: StoreObserver | null;
  userSubscription: SyncSubscription | null;
  allUsers: ChatUser[];
  allUsersObserver: StoreObserver | null;
  allUsersSubscription: SyncSubscription | null;
  addUser: (user: Omit<ChatUser, "_id"> & { _id?: string }) => Promise<void>;
  updateUser: (user: Partial<ChatUser> & { _id: string }) => Promise<void>;
  findUserById: (userId: string) => Promise<ChatUser | null>;

  // TODO: Subcription Rooms

  subscribeToRoom: (roomId: string) => Promise<void>;
  markRoomAsRead: (roomId: string) => Promise<void>;
  unsubscribeFromRoom: (roomId: string) => Promise<void>;
}

export const createChatUserSlice: CreateSlice<ChatUserSlice> = (
  _set,
  _get,
  { ditto, userId, userCollectionKey }: DittoConfParams,
) => {
  const store: ChatUserSlice = {
    usersLoading: true,
    currentUser: null,
    userObserver: null,
    userSubscription: null,
    allUsers: [],
    allUsersObserver: null,
    allUsersSubscription: null,
    async addUser(user) {
      if (!ditto) return;
      try {
        await ditto.store.execute(
          `INSERT INTO ${userCollectionKey} DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE`,
          { newUser: user },
        );
      } catch (err) {
        console.error("Error in addUser:", err);
      }
    },
    async updateUser({ _id, ...patch }) {
      if (!ditto) return;
      if (!_id) return;
      try {
        // Fetch the current user
        const current = await _get().findUserById(_id);
        if (!current) return;
        const updated = { ...current, ...patch };
        await ditto.store.execute(
          `INSERT INTO ${userCollectionKey} DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE`,
          { newUser: updated },
        );
      } catch (err) {
        console.error("Error in updateUser:", err);
      }
    },
    async findUserById(userId) {
      if (!ditto) return null;
      try {
        const result = await ditto.store.execute<ChatUser>(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId },
        );
        return result.items?.[0]?.value;
      } catch (err) {
        console.error("Error in findUserById:", err);
        return null;
      }
    },

    async subscribeToRoom(roomId: string) {
      if (!ditto || !userId) return;
      try {
        const user = await _get().findUserById(userId);
        if (!user) return;

        // Only subscribe if not already subscribed
        if (!user.subscriptions || !user.subscriptions[roomId]) {
          const now = new Date().toISOString();
          const subscriptions = { ...user.subscriptions, [roomId]: now };
          await _get().updateUser({ _id: userId, subscriptions });
        }
      } catch (err) {
        console.error("Error in subscribeToRoom:", err);
      }
    },

    async markRoomAsRead(roomId: string) {
      if (!ditto || !userId) return;
      try {
        let hasChanges = false;
        const user = await _get().findUserById(userId);
        if (!user) return;
        const subscriptions: Record<string, string | null> =
          user.subscriptions || {};
        const mentions: Record<string, string[]> = user.mentions || {};

        // Only mark as read if already subscribed
        if (subscriptions[roomId]) {
          const now = new Date().toISOString();
          subscriptions[roomId] = now;
          hasChanges = true;
        }
        // Clear mentions if room is marked as read
        if (mentions[roomId]) {
          mentions[roomId] = [];
          hasChanges = true;
        }
        if (hasChanges)
          await _get().updateUser({ _id: userId, subscriptions, mentions });
      } catch (err) {
        console.error("Error in markRoomAsRead:", err);
      }
    },

    // Add an unsubscribe function as well
    async unsubscribeFromRoom(roomId: string) {
      if (!ditto || !userId) return;
      try {
        const user = await _get().findUserById(userId);
        if (!user || !user.subscriptions) return;

        const subscriptions = { ...user.subscriptions };
        delete subscriptions[roomId];
        await _get().updateUser({ _id: userId, subscriptions });
      } catch (err) {
        console.error("Error in unsubscribeFromRoom:", err);
      }
    },
  };

  if (ditto) {
    const userQuery = `SELECT * FROM ${userCollectionKey} WHERE _id = :id`;
    const allUsersQuery = `SELECT * FROM ${userCollectionKey}`;

    const queryParams = { id: userId };

    store.userSubscription = ditto.sync.registerSubscription(
      userQuery,
      queryParams,
    );

    store.userObserver = ditto.store.registerObserver<ChatUser>(
      userQuery,
      (result) => {
        _set({ currentUser: result.items?.[0]?.value });
      },
      queryParams,
    );

    store.allUsersSubscription = ditto.sync.registerSubscription(allUsersQuery);

    store.allUsersObserver = ditto.store.registerObserver<ChatUser>(
      allUsersQuery,
      (result) => {
        _set({
          allUsers: result.items.map((doc) => doc.value),
          usersLoading: false,
        });
      },
    );
  }

  return store;
};
