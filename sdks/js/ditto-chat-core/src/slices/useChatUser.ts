import { StoreObserver, SyncSubscription } from '@dittolive/ditto'

import ChatUser from '../types/ChatUser'
import { CreateSlice, DittoConfParams } from '../useChat'

export interface ChatUserSlice {
  usersLoading: boolean
  currentUser: ChatUser | null
  userObserver: StoreObserver | null
  userSubscription: SyncSubscription | null
  allUsers: ChatUser[]
  allUsersObserver: StoreObserver | null
  allUsersSubscription: SyncSubscription | null
  addUser: (user: Omit<ChatUser, '_id'> & { _id?: string }) => Promise<void>
  updateUser: (user: Partial<ChatUser> & { _id: string }) => Promise<void>
  findUserById: (userId: string) => Promise<ChatUser | null>
  markRoomAsRead: (roomId: string) => Promise<void>
  toggleRoomSubscription: (roomId: string) => Promise<void>
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
     * Add a new user to the users collection.
     *
     * This method creates or updates a user document in the Ditto store.
     * Uses upsert behavior to handle both new and existing users.
     *
     * Workflow:
     * 1. Validates Ditto is initialized
     * 2. Executes INSERT with ON ID CONFLICT DO UPDATE
     * 3. Creates new user or updates existing if ID matches
     *
     * @param user - User object (with optional _id for upsert)
     */
    async addUser(user) {
      if (!ditto) {
        return
      }
      try {
        await ditto.store.execute(
          `INSERT INTO ${userCollectionKey} DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE`,
          { newUser: user },
        )
      } catch (err) {
        console.error('Error in addUser:', err)
      }
    },
    /**
     * Update an existing user's fields.
     *
     * This method merges patch data with existing user data and persists.
     * Only the specified fields are updated; others remain unchanged.
     *
     * Workflow:
     * 1. Validates Ditto and user ID
     * 2. Fetches current user data
     * 3. Merges patch with existing user
     * 4. Persists updated user document
     *
     * @param params - Object with _id and fields to update
     */
    async updateUser({ _id, ...patch }) {
      if (!ditto) {
        return
      }
      if (!_id) {
        return
      }
      try {
        const current = await _get().findUserById(_id)
        if (!current) {
          return
        }
        const updated = { ...current, ...patch }
        await ditto.store.execute(
          `INSERT INTO ${userCollectionKey} DOCUMENTS (:newUser) ON ID CONFLICT DO UPDATE`,
          { newUser: updated },
        )
      } catch (err) {
        console.error('Error in updateUser:', err)
      }
    },
    /**
     * Find a user by their unique ID.
     *
     * This method queries the users collection for a specific user.
     *
     * Workflow:
     * 1. Validates Ditto is initialized
     * 2. Executes SELECT query with user ID
     * 3. Returns user object or null if not found
     *
     * @param userId - The unique identifier of the user
     * @returns Promise resolving to ChatUser or null
     */
    async findUserById(userId) {
      if (!ditto) {
        return null
      }
      try {
        const result = await ditto.store.execute<ChatUser>(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId },
        )
        return result.items?.[0]?.value
      } catch (err) {
        console.error('Error in findUserById:', err)
        return null
      }
    },

    /**
     * Mark a room's messages as read for the current user.
     *
     * This method updates the user's subscription timestamp and clears
     * any pending mentions for the specified room.
     *
     * Workflow:
     * 1. Validates Ditto and user ID
     * 2. Fetches current user data
     * 3. Updates subscription timestamp if subscribed
     * 4. Clears mentions array for the room
     * 5. Persists updated user document
     *
     * @param roomId - ID of the room to mark as read
     */
    async markRoomAsRead(roomId: string) {
      if (!ditto || !userId) {
        return
      }
      try {
        let hasChanges = false
        const user = await _get().findUserById(userId)
        if (!user) {
          return
        }
        const subscriptions: Record<string, string | null> =
          user.subscriptions || {}
        const mentions: Record<string, string[]> = user.mentions || {}

        // Only mark as read if already subscribed
        if (subscriptions[roomId]) {
          const now = new Date().toISOString()
          subscriptions[roomId] = now
          hasChanges = true
        }
        // Clear mentions if room is marked as read
        if (mentions[roomId]) {
          mentions[roomId] = []
          hasChanges = true
        }
        if (hasChanges) {
          await _get().updateUser({ _id: userId, subscriptions, mentions })
        }
      } catch (err) {
        console.error('Error in markRoomAsRead:', err)
      }
    },

    /**
     * Toggle subscription status for a room.
     *
     * This method subscribes to or unsubscribes from a room's notifications.
     * When subscribed, user receives notifications for new messages.
     *
     * Workflow:
     * 1. Checks canSubscribeToRoom permission
     * 2. Fetches current user data
     * 3. Toggles subscription (null = unsubscribed, timestamp = subscribed)
     * 4. Persists updated subscriptions map
     *
     * @param roomId - ID of the room to toggle subscription for
     */
    async toggleRoomSubscription(roomId: string) {
      if (!ditto || !userId) {
        return
      }

      // Check subscribe permission
      if (!_get().canPerformAction('canSubscribeToRoom')) {
        console.warn('Permission denied: canSubscribeToRoom is false')
        return
      }

      try {
        const user = await _get().findUserById(userId)
        if (!user) {
          return
        }

        const subscriptions = { ...user.subscriptions }
        // Toggle: if subscribed (key exists AND value is not null), unsubscribe; otherwise subscribe
        if (roomId in subscriptions && subscriptions[roomId] !== null) {
          subscriptions[roomId] = null
        } else {
          const now = new Date().toISOString()
          subscriptions[roomId] = now
        }

        await _get().updateUser({
          _id: userId,
          subscriptions,
        })
      } catch (err) {
        console.error('Error in toggleRoomSubscription:', err)
      }
    },
  }

  if (ditto) {
    const userQuery = `SELECT * FROM ${userCollectionKey} WHERE _id = :id`
    const allUsersQuery = `SELECT * FROM ${userCollectionKey}`

    const queryParams = { id: userId }

    store.userSubscription = ditto.sync.registerSubscription(
      userQuery,
      queryParams,
    )

    store.userObserver = ditto.store.registerObserver<ChatUser>(
      userQuery,
      (result) => {
        _set({ currentUser: result.items?.[0]?.value })
      },
      queryParams,
    )

    store.allUsersSubscription = ditto.sync.registerSubscription(allUsersQuery)

    store.allUsersObserver = ditto.store.registerObserver<ChatUser>(
      allUsersQuery,
      (result) => {
        _set({
          allUsers: result.items.map((doc) => doc.value),
          usersLoading: false,
        })
      },
    )
  }

  return store
}
