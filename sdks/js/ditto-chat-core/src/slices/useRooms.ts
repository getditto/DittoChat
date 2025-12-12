import {
  Ditto,
  QueryResult,
  StoreObserver,
  SyncSubscription,
} from '@dittolive/ditto'
import { produce } from 'immer'
import { v4 as uuidv4 } from 'uuid'
import { StoreApi } from 'zustand'

import ChatUser from '../types/ChatUser'
import Room from '../types/Room'
import { ChatStore, CreateSlice, DittoConfParams } from '../useChat'

export interface CreateRoomOptions {
  retentionDays?: number
  isGenerated?: boolean
}

export interface RoomSlice {
  rooms: Room[]
  dmRooms: Room[]
  roomsLoading: boolean
  roomsObserver: StoreObserver | null
  roomsSubscription: SyncSubscription | null
  dmRoomsObserver: StoreObserver | null
  dmRoomsSubscription: SyncSubscription | null
  createRoom: (
    name: string,
    options?: CreateRoomOptions,
  ) => Promise<void | Room>
  createDMRoom: (user: ChatUser) => Promise<void | Room>
  /**
   * Creates a generated room (comment room) with a specific ID.
   * Generated rooms are hidden from the main chat list and used
   * for programmatic use cases like comment threads.
   */
  createGeneratedRoom: (id: string, name: string) => Promise<void | Room>
  /**
   * Returns all public rooms, filtering out generated rooms (isGenerated === true).
   */
  getPublicRooms: () => Room[]
}

function handleRoomsObserverResult(
  _set: StoreApi<ChatStore>['setState'],
  _get: StoreApi<ChatStore>['getState'],
  observerResult: QueryResult<Room>,
) {
  if (observerResult.items.length === 0) {
    return
  }
  const rooms = observerResult.items.map((doc) => {
    const messagePublisher = _get().messagesPublisher
    messagePublisher(doc.value)
    return doc.value
  })
  _set((state: ChatStore) => {
    return produce(state, (draft) => {
      const otherRooms = state.rooms.filter(
        (room) => room.collectionId !== rooms[0].collectionId,
      )
      draft.rooms = otherRooms.concat(rooms)
      draft.roomsLoading = false
      return draft
    })
  })
}

/**
 * Creates a new room in the Ditto database (shared logic for rooms and DM rooms).
 *
 * This function provides the core room creation functionality used by both
 * regular rooms and direct message rooms. The workflow includes:
 *
 * 1. **Validation**:
 *    - Checks if Ditto instance is available
 *    - Returns early if Ditto is not initialized
 *
 * 2. **Room Document Construction**:
 *    - Generates a unique UUID for the room ID
 *    - Builds the room object with required fields:
 *      - Basic info: name, collection IDs, creation metadata
 *      - Creator information from currentUserId
 *      - ISO timestamp for creation time
 *      - Optional: participants array (for DM rooms)
 *      - Optional: retentionDays override (if specified)
 *
 * 3. **Database Persistence**:
 *    - Uses INSERT with ON ID CONFLICT DO UPDATE pattern
 *    - Ensures idempotent operations (won't create duplicates)
 *    - Executes the query with parameterized values for security
 *
 * This approach ensures:
 * - Code reusability between room types
 * - Consistent room structure across the application
 * - Safe database operations with conflict handling
 * - Flexibility for different retention policies per room
 *
 * @param params - Configuration object for room creation
 * @param params.ditto - Ditto instance for database operations
 * @param params.currentUserId - ID of the user creating the room
 * @param params.name - Display name for the room
 * @param params.collectionId - Collection to store the room ("rooms" or "dm_rooms")
 * @param params.messagesId - Collection for the room's messages ("messages" or "dm_messages")
 * @param params.participants - Optional array of user IDs (required for DM rooms)
 * @param params.retentionDays - Optional custom retention period for messages
 * @param params.isGenerated - Optional flag marking room as generated (hidden from main list)
 * @param params.id - Optional custom room ID (defaults to UUID)
 * @returns The created room object, or undefined if creation fails
 */
async function createRoomBase({
  ditto,
  currentUserId,
  name,
  collectionId,
  messagesId,
  participants = [],
  retentionDays,
  isGenerated = false,
  id,
}: {
  ditto: Ditto | null
  currentUserId: string
  name: string
  collectionId: 'rooms' | 'dm_rooms'
  messagesId: 'messages' | 'dm_messages'
  participants?: string[]
  retentionDays?: number
  isGenerated?: boolean
  id?: string
}) {
  if (!ditto) {
    return
  }

  try {
    const roomId = id || uuidv4()

    const room = {
      _id: roomId,
      name,
      messagesId,
      collectionId,
      isGenerated,
      createdBy: currentUserId,
      createdOn: new Date().toISOString(),
      participants: participants || undefined,
      ...(retentionDays !== undefined && { retentionDays }),
    }

    const query = `INSERT INTO \`${collectionId}\` DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`
    await ditto.store.execute(query, { newDoc: room })

    return room
  } catch (error) {
    console.error(`Error creating ${collectionId}:`, error)
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

    /**
     * Creates a new public room with RBAC permission checks.
     *
     * This function creates a new regular (non-DM) room in the chat application.
     * The creation process includes:
     *
     * 1. **Permission Check**:
     *    - Verifies the user has "canCreateRoom" permission via RBAC
     *    - Returns undefined immediately if permission is denied
     *    - Logs a warning for debugging permission issues
     *
     * 2. **User Context**:
     *    - Retrieves the current user from state
     *    - Falls back to the userId parameter if currentUser is not available
     *    - Ensures proper creator attribution
     *
     * 3. **Room Creation**:
     *    - Delegates to createRoomBase with appropriate parameters
     *    - Sets collectionId to "rooms" for regular rooms
     *    - Sets messagesId to "messages" collection
     *    - Passes through optional retentionDays parameter
     *
     * This approach ensures:
     * - RBAC integration prevents unauthorized room creation
     * - Consistent room creation through shared base function
     * - Optional custom retention policies per room
     *
     * @param name - Display name for the new room
     * @param options - Optional configuration for the room
     * @param options.retentionDays - Optional custom message retention period (overrides global default)
     * @param options.isGenerated - Optional flag to mark room as generated (hidden from main list)
     * @returns Promise resolving to the created Room object, or undefined if permission denied
     */
    createRoom(name: string, options?: CreateRoomOptions) {
      // Check create room permission
      if (!_get().canPerformAction('canCreateRoom')) {
        console.warn('Permission denied: canCreateRoom is false')
        return Promise.resolve(undefined)
      }

      const currentUser = _get().currentUser
      return createRoomBase({
        ditto,
        currentUserId: currentUser?._id || userId,
        name,
        collectionId: 'rooms',
        messagesId: 'messages',
        retentionDays: options?.retentionDays,
        isGenerated: options?.isGenerated ?? false,
      })
    },

    /**
     * Creates a new direct message (DM) room between two users.
     *
     * This function creates a private one-on-one chat room between the current
     * user and another user. The creation process includes:
     *
     * 1. **Validation**:
     *    - Ensures both current user and DM user have valid IDs
     *    - Throws an error if either user ID is missing
     *    - Prevents creation of invalid DM rooms
     *
     * 2. **Room Naming**:
     *    - Generates a room name combining both users' names
     *    - Format: "CurrentUser & OtherUser"
     *    - Provides clear identification of DM participants
     *
     * 3. **DM Room Creation**:
     *    - Delegates to createRoomBase with DM-specific parameters
     *    - Sets collectionId to "dm_rooms" for DM storage
     *    - Sets messagesId to "dm_messages" collection
     *    - Includes both user IDs in participants array
     *
     * This approach ensures:
     * - Proper participant tracking for DM rooms
     * - Separation of DM rooms from regular rooms in storage
     * - User-friendly room naming for DM conversations
     *
     * @param dmUser - The ChatUser to create a DM room with
     * @returns Promise resolving to the created DM Room object
     * @throws Error if either user ID is invalid or missing
     */
    createDMRoom(dmUser: ChatUser) {
      const currentUser = _get().currentUser
      if (!currentUser?._id || !dmUser?._id) {
        throw Error('Invalid users')
      }
      return createRoomBase({
        ditto,
        currentUserId: currentUser?._id || userId,
        name: `${currentUser?.name} & ${dmUser.name}`,
        collectionId: 'dm_rooms',
        messagesId: 'dm_messages',
        participants: [currentUser?._id, dmUser._id],
      })
    },

    /**
     * Creates a generated room (comment room) with a specific ID.
     *
     * Generated rooms are used for programmatic use cases like comment threads
     * on products, articles, or other entities. They are hidden from the main
     * chat list but can be accessed directly when needed.
     *
     * @param id - Custom ID for the room (e.g., "comments-product-123")
     * @param name - Display name for the room
     * @returns Promise resolving to the created Room object
     */
    createGeneratedRoom(id: string, name: string) {
      const currentUser = _get().currentUser
      return createRoomBase({
        ditto,
        currentUserId: currentUser?._id || userId,
        name,
        collectionId: 'rooms',
        messagesId: 'messages',
        isGenerated: true,
        id,
      })
    },

    /**
     * Returns all public rooms, filtering out generated rooms.
     *
     * This selector provides the list of rooms that should be displayed
     * in the main chat list, excluding generated/comment rooms.
     *
     * @returns Array of non-generated rooms
     */
    getPublicRooms() {
      return _get().rooms.filter((room) => !room.isGenerated)
    },
  }

  if (ditto) {
    const roomsQuery = `SELECT * from rooms`
    const dmRoomsQuery = `SELECT * from dm_rooms where (array_contains(participants, :userId))`
    store.roomsSubscription = ditto.sync.registerSubscription(roomsQuery)
    store.dmRoomsSubscription = ditto.sync.registerSubscription(dmRoomsQuery, {
      userId,
    })
    store.roomsObserver = ditto.store.registerObserver<Room>(
      roomsQuery,
      (result) => {
        handleRoomsObserverResult(_set, _get, result)
      },
    )
    store.dmRoomsObserver = ditto.store.registerObserver<Room>(
      dmRoomsQuery,
      (result) => {
        handleRoomsObserverResult(_set, _get, result)
      },
      {
        userId,
      },
    )
  }
  return store
}
