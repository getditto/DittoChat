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
  markRoomAsRead: (roomId: string) => Promise<void>;
  toggleRoomSubscription: (roomId: string) => Promise<void>;
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
    /**
     * Adds or updates a user in the Ditto database.
     * 
     * This function creates a new user or updates an existing one using
     * an upsert pattern. The workflow includes:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto instance is available
     *    - Returns early if Ditto is not initialized
     * 
     * 2. **Upsert Operation**:
     *    - Uses INSERT with ON ID CONFLICT DO UPDATE pattern
     *    - If user with same _id exists, updates it
     *    - If user doesn't exist, creates new user
     *    - Ensures idempotent operation (safe to call multiple times)
     * 
     * This approach ensures:
     * - No duplicate users with same ID
     * - Safe user initialization and updates
     * - Atomic database operations
     * 
     * @param user - User object with optional _id (auto-generated if not provided)
     */
    async addUser(user) {
      if (!ditto) { return; }
      try {
        await ditto.store.execute(
          `INSERT INTO ${userCollectionKey} DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE`,
          { newUser: user },
        );
      } catch (err) {
        console.error("Error in addUser:", err);
      }
    },
    /**
     * Updates a user's properties using a patch pattern.
     * 
     * This function implements a fetch-merge-save pattern for user updates:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto instance and user ID are available
     *    - Returns early if prerequisites are not met
     * 
     * 2. **Fetch Current State**:
     *    - Retrieves the current user document from the database
     *    - Returns if user doesn't exist (prevents creating users via update)
     * 
     * 3. **Merge Updates**:
     *    - Spreads current user properties
     *    - Applies patch properties on top
     *    - Preserves all properties not included in the patch
     * 
     * 4. **Persist Changes**:
     *    - Uses INSERT with ON ID CONFLICT DO UPDATE
     *    - Atomically saves the merged user object
     * 
     * This approach ensures:
     * - Partial updates without losing existing data
     * - Type-safe property updates
     * - Atomic database operations
     * - No accidental user creation through updates
     * 
     * @param user - Partial user object with required _id and optional fields to update
     */
    async updateUser({ _id, ...patch }) {
      if (!ditto) { return; }
      if (!_id) { return; }
      try {
        const current = await _get().findUserById(_id);
        if (!current) { return; }
        const updated = { ...current, ...patch };
        await ditto.store.execute(
          `INSERT INTO ${userCollectionKey} DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE`,
          { newUser: updated },
        );
      } catch (err) {
        console.error("Error in updateUser:", err);
      }
    },
    /**
     * Retrieves a user by their unique ID from the Ditto database.
     * 
     * This function queries the database for a specific user:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto instance is available
     *    - Returns null if Ditto is not initialized
     * 
     * 2. **Query Execution**:
     *    - Executes a SELECT query with parameterized _id
     *    - Uses parameterized queries to prevent SQL injection
     *    - Retrieves the first matching user (should be unique)
     * 
     * 3. **Result Extraction**:
     *    - Extracts the user value from the query result
     *    - Returns undefined if no user found
     * 
     * This approach ensures:
     * - Safe database queries with parameterization
     * - Consistent null/undefined handling
     * - Type-safe user retrieval
     * 
     * @param userId - Unique ID of the user to find
     * @returns Promise resolving to the ChatUser object, or null if not found or error occurs
     */
    async findUserById(userId) {
      if (!ditto) { return null; }
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

    /**
     * Marks a room as read for the current user by updating the subscription timestamp.
     * 
     * This function updates the user's room subscription status and clears mentions:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto instance and userId are available
     *    - Returns early if prerequisites are not met
     * 
     * 2. **Fetch User Data**:
     *    - Retrieves current user's subscriptions and mentions
     *    - Initializes empty objects if properties don't exist
     * 
     * 3. **Update Subscription Timestamp**:
     *    - Only updates if the room is already in subscriptions
     *    - Sets the subscription value to current ISO timestamp
     *    - This marks the "last read" time for the room
     *    - Flags that changes were made
     * 
     * 4. **Clear Mentions**:
     *    - Clears the mentions array for this room (if it exists)
     *    - Indicates all mentions have been read
     *    - Flags that changes were made
     * 
     * 5. **Persist Changes**:
     *    - Only calls updateUser if changes were actually made
     *    - Optimizes database operations by avoiding no-op updates
     * 
     * This approach ensures:
     * - Efficient "mark as read" without unnecessary updates
     * - Automatic mention clearing when room is viewed
     * - Timestamp tracking for unread badge logic
     * - Only updates subscribed rooms (doesn't auto-subscribe)
     * 
     * @param roomId - ID of the room to mark as read
     */
    async markRoomAsRead(roomId: string) {
      if (!ditto || !userId) { return; }
      try {
        let hasChanges = false;
        const user = await _get().findUserById(userId);
        if (!user) { return; }
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
        if (hasChanges) {
          await _get().updateUser({ _id: userId, subscriptions, mentions });
        }
      } catch (err) {
        console.error("Error in markRoomAsRead:", err);
      }
    },

    /**
     * Toggles the current user's subscription to a room.
     * 
     * This function implements a toggle pattern for room subscriptions with
     * RBAC permission checks. The workflow includes:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto instance and userId are available
     *    - Returns early if prerequisites are not met
     * 
     * 2. **Permission Check**:
     *    - Verifies user has "canSubscribeToRoom" permission via RBAC
     *    - Returns early and logs warning if permission denied
     *    - Prevents unauthorized subscription changes
     * 
     * 3. **Fetch User Data**:
     *    - Retrieves current user's subscriptions
     *    - Creates a shallow copy for immutable updates
     * 
     * 4. **Toggle Logic**:
     *    - If room is subscribed (key exists AND value is not null):
     *      - Sets value to null (unsubscribes but keeps the key)
     *    - Otherwise (not subscribed or value is null):
     *      - Sets value to current ISO timestamp (subscribes)
     *    - This preserves subscription history while toggling state
     * 
     * 5. **Persist Changes**:
     *    - Updates only the subscriptions field
     *    - Preserves all other user properties
     * 
     * This approach ensures:
     * - RBAC integration prevents unauthorized subscriptions
     * - Atomic toggle operations
     * - Subscription timestamp tracking for unread logic
     * - Distinction between "never subscribed" and "unsubscribed"
     * 
     * @param roomId - ID of the room to subscribe/unsubscribe
     */
    async toggleRoomSubscription(roomId: string) {
      if (!ditto || !userId) { return; }

      // Check subscribe permission
      if (!_get().canPerformAction("canSubscribeToRoom")) {
        console.warn("Permission denied: canSubscribeToRoom is false");
        return;
      }

      try {
        const user = await _get().findUserById(userId);
        if (!user) { return; }

        const subscriptions = { ...user.subscriptions };
        // Toggle: if subscribed (key exists AND value is not null), unsubscribe; otherwise subscribe
        if (roomId in subscriptions && subscriptions[roomId] !== null) {
          subscriptions[roomId] = null;
        } else {
          const now = new Date().toISOString();
          subscriptions[roomId] = now;
        }

        await _get().updateUser({
          _id: userId,
          subscriptions,
        });
      } catch (err) {
        console.error("Error in toggleRoomSubscription:", err);
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
