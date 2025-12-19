import {
  Attachment,
  AttachmentToken,
  StoreObserver,
  SyncSubscription,
} from '@dittolive/ditto'
import { castDraft, produce, WritableDraft } from 'immer'
import { v4 as uuidv4 } from 'uuid'

import ChatUser from '../types/ChatUser'
import Message, { Mention, Reaction } from '../types/Message'
import MessageWithUser from '../types/MessageWithUser'
import Room from '../types/Room'
import { ChatStore, CreateSlice } from '../useChat'

export interface MessageSlice {
  messagesByRoom: Record<string, MessageWithUser[]>
  messageObserversByRoom: Record<string, StoreObserver | null>
  messageSubscriptionsByRoom: Record<string, SyncSubscription | null>
  messagesLoading: boolean
  messagesPublisher: (room: Room, retentionDays?: number) => Promise<void>
  /**
   * Subscribe to messages for a specific room on-demand.
   * Used for generated rooms (comment rooms) that need dynamic subscriptions.
   */
  subscribeToRoomMessages: (
    roomId: string,
    messagesId: string,
    retentionDays?: number,
  ) => Promise<void>
  /**
   * Unsubscribe from messages for a specific room.
   * Cleans up subscription, observer, and messages from state.
   */
  unsubscribeFromRoomMessages: (roomId: string) => void
  createMessage: (
    room: Room,
    text: string,
    mentions?: Mention[],
  ) => Promise<void>
  saveEditedTextMessage: (message: Message, room: Room) => Promise<void>
  saveDeletedMessage: (
    message: Message,
    room: Room,
    type?: 'text' | 'image' | 'file',
  ) => Promise<void>
  createImageMessage: (
    room: Room,
    imageFile: File,
    text?: string,
  ) => Promise<void>
  createFileMessage: (room: Room, file: File, text?: string) => Promise<void>
  fetchAttachment: (
    token: AttachmentToken,
    onProgress: (progress: number) => void,
    onComplete: (result: AttachmentResult) => void,
  ) => void
  notificationHandler: ((message: MessageWithUser, room: Room) => void) | null
  registerNotificationHandler: (
    handler: (message: MessageWithUser, room: Room) => void,
  ) => void
  updateMessageReactions: (
    message: Message,
    room: Room,
    reactions: Reaction[],
  ) => Promise<void>
  addReactionToMessage: (
    message: Message,
    room: Room,
    reaction: Reaction,
  ) => Promise<void>
  removeReactionFromMessage: (
    message: Message,
    room: Room,
    reaction: Reaction,
  ) => Promise<void>
}

interface AttachmentResult {
  success: boolean
  data?: Uint8Array
  metadata?: Record<string, string>
  error?: Error
}

const DEFAULT_RETENTION_DAYS = 30
const MESSAGE_RECENCY_THRESHOLD = 10000 // 10 seconds
const THUMBNAIL_MAX_SIZE = 282

export const createMessageSlice: CreateSlice<MessageSlice> = (
  _set,
  _get,
  {
    ditto,
    userId,
    userCollectionKey,
    retentionDays: globalRetentionDays,
    notificationHandler,
  },
) => {
  // Helper: Get room details
  const getRoomDetails = async (room: Room) => {
    if (!ditto) {
      throw new Error('Ditto not initialized')
    }

    const result = await ditto.store.execute<Room>(
      `SELECT * FROM ${room.collectionId || 'rooms'} WHERE _id = :id`,
      { id: room._id },
    )

    if (result.items.length === 0) {
      throw new Error('Room not found')
    }
    return result.items[0].value
  }

  // Helper: Get current user details
  const getCurrentUser = async () => {
    if (!ditto || !userId) {
      throw new Error('Ditto not initialized or user not found')
    }

    const result = await ditto.store.execute<ChatUser>(
      `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
      { id: userId },
    )

    const userValue = result.items?.[0]?.value
    return {
      id: userId,
      name: userValue?.name ?? userId,
    }
  }

  const updateMessageLoadingState = () => {
    _set((state: ChatStore) => {
      return produce(state, (draft) => {
        draft.messagesLoading = !draft.rooms.every(
          (room) => room._id in draft.messagesByRoom,
        )
      })
    })
  }

  // Helper: Handle message updates in state
  const handleMessageUpdate = (
    stateMessages: WritableDraft<MessageWithUser>[],
    room: Room,
    message: Message,
    user?: ChatUser,
  ) => {
    const messageWithUser: MessageWithUser = {
      message,
      user,
      id: message._id,
    }

    const mutableMessage = castDraft({
      ...messageWithUser,
      message: messageWithUser.message,
      user: messageWithUser.user,
    })
    // Check for notifications on new messages
    const existingIndex = stateMessages.findIndex((m) => m.id === message._id)

    if (
      existingIndex === -1 &&
      !message.archivedMessage &&
      shouldNotify(message, room) &&
      notificationHandler
    ) {
      // Trigger notification handler if registered (for browser notifications and toasts)
      // _get().notificationHandler?.({ message, user, id: message._id }, room);

      // Trigger toast notification if not viewing this room
      const activeRoomId = _get().activeRoomId
      if (activeRoomId !== room._id) {
        const senderName = user?.name || 'Unknown User'
        const roomName = room.name
        const isDM = room.collectionId === 'dm_rooms'

        const title = isDM
          ? `New message from ${senderName}`
          : `#${roomName}: ${senderName}`

        const preview = message.text
          ? message.text.substring(0, 30) +
            (message.text.length > 30 ? '...' : '')
          : 'Sent an attachment'

        notificationHandler(title, preview)
      }
    }

    // Handle edited messages
    if (message.archivedMessage) {
      const originalIndex = stateMessages.findIndex(
        (m) => m.id === message.archivedMessage,
      )

      if (originalIndex !== -1) {
        stateMessages[originalIndex] = mutableMessage
      } else if (existingIndex === -1) {
        stateMessages.push(mutableMessage)
      } else {
        stateMessages[existingIndex] = mutableMessage
      }
    } else {
      // Handle new/updated messages
      if (existingIndex === -1) {
        stateMessages.push(mutableMessage)
      } else {
        stateMessages[existingIndex] = mutableMessage
      }
    }
  }

  // Helper: Check if should notify user
  const shouldNotify = (message: Message, room: Room) => {
    const currentState = _get()
    const currentUser = currentState.currentUser

    const isOwnMessage = message.userId === currentUser?._id
    const isRecent =
      new Date(message.createdOn).getTime() >
      Date.now() - MESSAGE_RECENCY_THRESHOLD
    const isSubscribed = currentUser?.subscriptions?.[room._id]
    const isMentioned = message.mentions?.some(
      (mention) => mention.userId === currentUser?._id,
    )
    const isDM = room.collectionId === 'dm_rooms'

    return !isOwnMessage && isRecent && (isSubscribed || isDM || isMentioned)
  }

  // Helper: Create a message document
  const createMessageDocument = async (
    room: Room,
    messageData: Partial<Message> & { text: string },
    collectionSpec: string = '',
  ) => {
    if (!ditto || !userId) {
      throw new Error('Ditto not initialized or user not found')
    }

    const actualRoom = await getRoomDetails(room)
    const id = messageData._id || uuidv4()
    const newDoc = {
      _id: id,
      roomId: room._id,
      userId,
      createdOn: new Date().toISOString(),
      isArchived: false,
      archivedMessage: null,
      largeImageToken: null,
      thumbnailImageToken: null,
      fileAttachmentToken: null,
      isEdited: false,
      isDeleted: false,
      ...messageData,
      mentions: messageData.mentions?.map((m) => ({ ...m })) || [],
      reactions: messageData.reactions?.map((r) => ({ ...r })) || [],
    }

    const collectionClause = collectionSpec
      ? `COLLECTION ${actualRoom.messagesId} ${collectionSpec}`
      : actualRoom.messagesId
    await ditto.store.execute(
      `INSERT INTO ${collectionClause} DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`,
      { newDoc },
    )
    if (messageData.mentions && messageData.mentions.length > 0) {
      // Update user mentions
      const users = _get().allUsers
      await Promise.all(
        messageData.mentions.map((mention) => {
          const user = users.find((u: ChatUser) => u._id === mention.userId)
          if (!user) {
            return
          }

          const userMentions = {
            ...(user.mentions || {}),
            [room._id]: [...(user.mentions?.[room._id] || []), id],
          }

          return ditto.store.execute(
            `UPDATE users SET mentions = :mentions WHERE _id = :id`,
            { id: user._id, mentions: userMentions },
          )
        }),
      )
    }

    return newDoc
  }

  // Helper: Archive and create new message (for edits/deletes)
  const archiveAndCreateMessage = async (
    message: Message,
    room: Room,
    newMessageData: Partial<Message>,
  ) => {
    if (!ditto) {
      throw new Error('Ditto not initialized')
    }

    await ditto.store.execute(
      `UPDATE ${room.messagesId} SET isArchived = :isArchived WHERE _id = :id`,
      { id: message._id, isArchived: true },
    )

    return createMessageDocument(room, {
      text: '',
      createdOn: message.createdOn,
      archivedMessage: message._id,
      ...newMessageData,
    })
  }

  // Helper: Create attachment message (unified for images and files)
  const createAttachmentMessage = async (
    room: Room,
    file: File,
    text: string | undefined,
    attachmentType: 'image' | 'file',
  ) => {
    if (!ditto || !userId) {
      throw new Error('Ditto not initialized or user not found')
    }

    const user = await getCurrentUser()
    const attachments: Record<string, Attachment | null> = {
      thumbnailImageToken: null,
      largeImageToken: null,
      fileAttachmentToken: null,
    }

    if (attachmentType === 'image') {
      const thumbnailImage = await createThumbnail(file)
      const thumbnailBlob = await imageToBlob(thumbnailImage)
      const thumbnailData = new Uint8Array(await thumbnailBlob.arrayBuffer())
      attachments.thumbnailImageToken = await ditto.store.newAttachment(
        thumbnailData,
        createAttachmentMetadata(user.id, user.name, 'thumbnail', file),
      )

      const largeImageBlob = await imageToBlob(await fileToImage(file))
      const largeImageData = new Uint8Array(await largeImageBlob.arrayBuffer())
      attachments.largeImageToken = await ditto.store.newAttachment(
        largeImageData,
        createAttachmentMetadata(user.id, user.name, 'large', file),
      )
    } else {
      const fileData = new Uint8Array(await file.arrayBuffer())
      attachments.fileAttachmentToken = await ditto.store.newAttachment(
        fileData,
        createAttachmentMetadata(user.id, user.name, 'file', file),
      )
    }

    const collectionSpec =
      attachmentType === 'image'
        ? '(thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT)'
        : '(fileAttachmentToken ATTACHMENT)'

    await createMessageDocument(
      room,
      {
        text: text || (attachmentType === 'file' ? file.name : ''),
        ...attachments,
      },
      collectionSpec,
    )
  }

  const store: MessageSlice = {
    messagesLoading: true,
    messagesByRoom: {},
    messageObserversByRoom: {},
    messageSubscriptionsByRoom: {},
    notificationHandler: null,

    /**
     * Register a notification handler for new messages.
     *
     * This method sets up a callback to be invoked when new messages
     * arrive and meet notification criteria (subscribed rooms, mentions, DMs).
     *
     * Use case: Displaying toast notifications or browser notifications
     *
     * @param handler - Callback function receiving (title, preview) parameters
     */
    registerNotificationHandler(handler) {
      _set({ notificationHandler: handler })
    },

    /**
     * Subscribe to and observe messages for a room.
     *
     * This method sets up real-time sync and observation for messages in a room.
     * It's automatically called for each room when the chat store initializes.
     *
     * Workflow:
     * 1. Validates Ditto is initialized and no existing subscription
     * 2. Calculates retention date based on room/global settings
     * 3. Creates sync subscription for message documents
     * 4. Sets up store observer to update state on changes
     * 5. Triggers notifications for new messages from other users
     *
     * @param room - Room to subscribe to messages for
     * @param retentionDays - Optional override for message retention period
     */
    async messagesPublisher(room: Room, retentionDays?: number) {
      if (!ditto) {
        return
      }

      const roomId = room._id
      if (_get().messageSubscriptionsByRoom[roomId]) {
        return
      }

      const effectiveRetentionDays =
        retentionDays ??
        room.retentionDays ??
        globalRetentionDays ??
        DEFAULT_RETENTION_DAYS

      const retentionDate = new Date(
        Date.now() - effectiveRetentionDays * 24 * 60 * 60 * 1000,
      )
      const query = `SELECT * FROM COLLECTION ${room.messagesId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT, fileAttachmentToken ATTACHMENT)
        WHERE roomId = :roomId AND createdOn >= :date AND isArchived = false
        ORDER BY createdOn ASC`

      const args = {
        roomId: room._id,
        date: retentionDate.toISOString(),
      }

      try {
        const subscription = ditto.sync.registerSubscription(query, args)
        const allUsers = _get().allUsers

        const observer = ditto.store.registerObserver<Message>(
          query,
          async (result) => {
            // Update all messages at single time on state
            _set((state: ChatStore) => {
              return produce(state, (draft) => {
                if (!draft.messagesByRoom[room._id]) {
                  draft.messagesByRoom[room._id] = []
                }
                if (result.items.length === 0) {
                  return draft
                }

                for (const item of result.items) {
                  const message = item.value
                  const messagesByRoom = draft.messagesByRoom[room._id]
                  const user = allUsers.find((u) => u._id === message.userId)
                  // update message on the store
                  handleMessageUpdate(messagesByRoom, room, message, user)
                }
                return draft
              })
            })
            updateMessageLoadingState()
          },
          args,
        )

        _set({
          messageSubscriptionsByRoom: {
            ..._get().messageSubscriptionsByRoom,
            [roomId]: subscription,
          },
          messageObserversByRoom: {
            ..._get().messageObserversByRoom,
            [roomId]: observer,
          },
        })
      } catch (err) {
        console.error('Error in messagesPublisher:', err)
      }
    },

    /**
     * Subscribe to messages for a specific room on-demand.
     *
     * This method enables dynamic subscription management for generated rooms.
     * Unlike messagesPublisher which is called automatically for all rooms,
     * this method is explicitly called when a component mounts to view a room.
     *
     * Workflow:
     * 1. Validates Ditto is initialized
     * 2. Checks for existing subscription (prevents duplicates)
     * 3. Creates subscription and observer using same logic as messagesPublisher
     * 4. Stores subscription/observer references in state
     *
     * Use case: ChatView component mounting to display a generated room
     *
     * @param roomId - Room ID to subscribe to
     * @param messagesId - Collection ID for messages ("messages" or "dm_messages")
     * @param retentionDays - Optional message retention override
     */
    async subscribeToRoomMessages(
      roomId: string,
      messagesId: string,
      retentionDays?: number,
    ) {
      if (!ditto) {
        return
      }

      // Check if already subscribed
      if (_get().messageSubscriptionsByRoom[roomId]) {
        return
      }

      const effectiveRetentionDays =
        retentionDays ?? globalRetentionDays ?? DEFAULT_RETENTION_DAYS

      const retentionDate = new Date(
        Date.now() - effectiveRetentionDays * 24 * 60 * 60 * 1000,
      )

      const query = `SELECT * FROM COLLECTION ${messagesId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT, fileAttachmentToken ATTACHMENT)
        WHERE roomId = :roomId AND createdOn >= :date AND isArchived = false
        ORDER BY createdOn ASC`

      const args = {
        roomId,
        date: retentionDate.toISOString(),
      }

      try {
        const subscription = ditto.sync.registerSubscription(query, args)
        const allUsers = _get().allUsers

        const observer = ditto.store.registerObserver<Message>(
          query,
          async (result) => {
            // Create a minimal room object for message processing
            const room: Room = {
              _id: roomId,
              name: '',
              messagesId,
              collectionId: 'rooms',
              createdBy: '',
              createdOn: '',
              isGenerated: true,
            }

            _set((state: ChatStore) => {
              return produce(state, (draft) => {
                if (!draft.messagesByRoom[roomId]) {
                  draft.messagesByRoom[roomId] = []
                }
                if (result.items.length === 0) {
                  return draft
                }

                for (const item of result.items) {
                  const message = item.value
                  const messagesByRoom = draft.messagesByRoom[roomId]
                  const user = allUsers.find((u) => u._id === message.userId)
                  handleMessageUpdate(messagesByRoom, room, message, user)
                }
                return draft
              })
            })
            updateMessageLoadingState()
          },
          args,
        )

        _set({
          messageSubscriptionsByRoom: {
            ..._get().messageSubscriptionsByRoom,
            [roomId]: subscription,
          },
          messageObserversByRoom: {
            ..._get().messageObserversByRoom,
            [roomId]: observer,
          },
        })
      } catch (err) {
        console.error('Error in subscribeToRoomMessages:', err)
      }
    },

    /**
     * Unsubscribe from messages for a specific room.
     *
     * This method cleans up subscriptions when a component unmounts.
     * Essential for preventing memory leaks with dynamic subscriptions.
     *
     * Workflow:
     * 1. Retrieves subscription and observer from state
     * 2. Cancels subscription (stops sync)
     * 3. Cancels observer (stops state updates)
     * 4. Removes messages from state
     * 5. Removes subscription/observer references from state
     *
     * Use case: ChatView component unmounting after viewing a generated room
     *
     * @param roomId - Room ID to unsubscribe from
     */
    unsubscribeFromRoomMessages(roomId: string) {
      const subscription = _get().messageSubscriptionsByRoom[roomId]
      const observer = _get().messageObserversByRoom[roomId]

      // Cancel subscription - check if not already cancelled
      if (subscription && !subscription.isCancelled) {
        subscription.cancel()
      }

      // Cancel observer - check if not already cancelled
      if (observer && !observer.isCancelled) {
        observer.cancel()
      }

      // Remove from state
      _set((state: ChatStore) => {
        return produce(state, (draft) => {
          // Remove messages
          delete draft.messagesByRoom[roomId]

          // Remove subscription reference
          delete draft.messageSubscriptionsByRoom[roomId]

          // Remove observer reference
          delete draft.messageObserversByRoom[roomId]

          return draft
        })
      })
    },

    /**
     * Create a new text message in a room.
     *
     * This method creates and persists a new message document with optional mentions.
     * Mention permission is checked before including mentions in the message.
     *
     * Workflow:
     * 1. Validates Ditto connection and user
     * 2. Checks mention permission if mentions provided
     * 3. Creates message document with text and filtered mentions
     * 4. Updates mentioned users' mention records
     *
     * @param room - Room to create message in
     * @param text - Message text content
     * @param mentions - Optional array of user mentions
     */
    async createMessage(room: Room, text: string, mentions: Mention[] = []) {
      if (!ditto || !userId) {
        return
      }

      // Check mention permission if mentions are provided
      const hasMentionPermission = _get().canPerformAction('canMentionUsers')
      const filteredMentions =
        mentions.length > 0 && !hasMentionPermission ? [] : mentions

      if (mentions.length > 0 && !hasMentionPermission) {
        console.warn('Permission denied: canMentionUsers is false')
      }

      try {
        await createMessageDocument(room, {
          text,
          mentions: filteredMentions,
        })
      } catch (err) {
        console.error('Error in createMessage:', err)
      }
    },

    /**
     * Save edits to an existing message.
     *
     * This method archives the original message and creates a new version
     * with updated content while preserving attachments and reactions.
     *
     * Workflow:
     * 1. Checks canEditOwnMessage permission
     * 2. Archives original message (sets isArchived = true)
     * 3. Creates new message with archivedMessage reference
     * 4. Preserves attachments, mentions, and reactions
     *
     * @param message - Message with updated text content
     * @param room - Room containing the message
     */
    async saveEditedTextMessage(message: Message, room: Room) {
      // Check edit permission
      if (!_get().canPerformAction('canEditOwnMessage')) {
        console.warn('Permission denied: canEditOwnMessage is false')
        return
      }

      try {
        await archiveAndCreateMessage(message, room, {
          text: message.text,
          largeImageToken: message.largeImageToken || null,
          thumbnailImageToken: message.thumbnailImageToken || null,
          fileAttachmentToken: message.fileAttachmentToken || null,
          isEdited: true,
          isDeleted: false,
          mentions: message.mentions,
          reactions: message.reactions,
        })
      } catch (err) {
        console.error('Error in saveEditedTextMessage:', err)
      }
    },

    /**
     * Soft-delete a message by replacing its content.
     *
     * This method archives the original message and creates a placeholder
     * indicating deletion. Attachments are removed and content is replaced.
     *
     * Workflow:
     * 1. Checks canDeleteOwnMessage permission
     * 2. Archives original message
     * 3. Creates replacement with "[deleted ...]" text
     * 4. Removes all attachments and mentions
     *
     * @param message - Message to delete
     * @param room - Room containing the message
     * @param type - Type of content: 'text', 'image', or 'file'
     */
    async saveDeletedMessage(
      message: Message,
      room: Room,
      type: 'text' | 'image' | 'file' = 'text',
    ) {
      // Check delete permission
      if (!_get().canPerformAction('canDeleteOwnMessage')) {
        console.warn('Permission denied: canDeleteOwnMessage is false')
        return
      }

      const deletedText = {
        text: '[deleted message]',
        image: '[deleted image]',
        file: '[deleted file]',
      }[type]

      try {
        await archiveAndCreateMessage(message, room, {
          text: deletedText,
          createdOn: new Date().toISOString(),
          largeImageToken: null,
          thumbnailImageToken: null,
          fileAttachmentToken: null,
          isEdited: false,
          isDeleted: true,
          mentions: [],
        })
      } catch (err) {
        console.error('Error in saveDeletedMessage:', err)
      }
    },

    /**
     * Create a message with an image attachment.
     *
     * This method creates a message with both thumbnail and full-size
     * image attachments for efficient loading in the UI.
     *
     * Workflow:
     * 1. Creates thumbnail version of image
     * 2. Uploads both thumbnail and large image as attachments
     * 3. Creates message document with attachment tokens
     *
     * @param room - Room to create message in
     * @param imageFile - Image file to attach
     * @param text - Optional caption text
     */
    async createImageMessage(room: Room, imageFile: File, text?: string) {
      try {
        await createAttachmentMessage(room, imageFile, text, 'image')
      } catch (err) {
        console.error('Error in createImageMessage:', err)
      }
    },

    /**
     * Create a message with a file attachment.
     *
     * This method uploads a file and creates a message with the
     * file attachment token. The filename is used as default text.
     *
     * Workflow:
     * 1. Uploads file as attachment with metadata
     * 2. Creates message document with file attachment token
     * 3. Uses filename as message text if not provided
     *
     * @param room - Room to create message in
     * @param file - File to attach
     * @param text - Optional text (defaults to filename)
     */
    async createFileMessage(room: Room, file: File, text?: string) {
      try {
        await createAttachmentMessage(room, file, text, 'file')
      } catch (err) {
        console.error('Error in createFileMessage:', err)
      }
    },

    /**
     * Fetch attachment data with progress tracking.
     *
     * This method downloads attachment data from Ditto's attachment store,
     * providing progress updates during download and handling various states.
     *
     * Workflow:
     * 1. Validates Ditto and token are available
     * 2. Initiates attachment fetch with event handler
     * 3. Reports progress via onProgress callback
     * 4. Returns data and metadata on completion
     * 5. Handles deletion and error states
     *
     * @param token - Attachment token from message
     * @param onProgress - Callback receiving progress (0-1)
     * @param onComplete - Callback receiving AttachmentResult
     */
    fetchAttachment(token, onProgress, onComplete) {
      if (!ditto) {
        onComplete({
          success: false,
          error: new Error('Ditto not initialized'),
        })
        return
      }

      if (!token) {
        onComplete({
          success: false,
          error: new Error('No attachment token provided'),
        })
        return
      }

      try {
        ditto.store.fetchAttachment(token, async (event) => {
          switch (event.type) {
            case 'Progress': {
              const progress =
                Number(event.downloadedBytes) / (Number(event.totalBytes) || 1)
              onProgress(progress)
              break
            }

            case 'Completed':
              try {
                const dataResult = event.attachment.getData()
                const data =
                  dataResult instanceof Promise ? await dataResult : dataResult
                onComplete({
                  success: true,
                  data,
                  metadata: event.attachment.metadata || {},
                })
              } catch (error) {
                onComplete({
                  success: false,
                  error:
                    error instanceof Error
                      ? error
                      : new Error('Unknown error getting attachment data'),
                })
              }
              break

            case 'Deleted':
              onComplete({
                success: false,
                error: new Error('Attachment was deleted'),
              })
              break
          }
        })
      } catch (error) {
        onComplete({
          success: false,
          error:
            error instanceof Error
              ? error
              : new Error('Failed to fetch attachment'),
        })
      }
    },

    /**
     * Updates message reactions using an optimistic update pattern.
     *
     * This function implements optimistic UI updates to provide instant feedback
     * to users without waiting for database operations to complete. The pattern
     * works in two phases:
     *
     * 1. **Optimistic Update (Immediate)**:
     *    - Updates the local state immediately with the new reactions
     *    - Provides instant UI feedback for a responsive user experience
     *    - Users see their reaction changes without any delay
     *
     * 2. **Database Persistence (Async)**:
     *    - Asynchronously persists the changes to the Ditto database
     *    - If the database update fails, automatically rolls back the UI changes
     *    - Restores the previous reactions state to maintain data consistency
     *
     * This approach ensures:
     * - Quick UI interactions without perceived latency
     * - Data consistency through automatic rollback on errors
     * - Better user experience compared to waiting for DB operations
     *
     * @param message - The message whose reactions are being updated
     * @param room - The room containing the message
     * @param reactions - The new array of reactions to apply
     */
    async updateMessageReactions(
      message: Message,
      room: Room,
      reactions: Reaction[],
    ) {
      if (!ditto || !userId) {
        return
      }

      const roomId = room._id
      const roomMessages = _get().messagesByRoom[roomId] || []
      const index = roomMessages.findIndex((m) => m.id === message._id)

      if (index === -1) {
        throw new Error('Message not found')
      }

      const originalMessage = roomMessages[index].message
      const previousReactions = originalMessage.reactions || []

      // Phase 1: Optimistic update - immediately update UI state
      // This provides instant feedback to the user without waiting for DB operations
      _set((state: ChatStore) =>
        produce(state, (draft) => {
          draft.messagesByRoom[roomId][index].message.reactions = reactions
        }),
      )

      // Phase 2: Async DB persistence with automatic rollback on failure
      // Using setTimeout(0) to defer DB operations without blocking the UI
      setTimeout(async () => {
        try {
          await ditto.store.execute(
            `UPDATE ${room.messagesId} SET reactions = :reactions WHERE _id = :id`,
            { id: originalMessage._id, reactions },
          )
        } catch (err) {
          // Rollback: Restore previous state if DB update fails
          console.error('Error updating reactions, rolling back:', err)
          _set((state: ChatStore) =>
            produce(state, (draft) => {
              draft.messagesByRoom[roomId][index].message.reactions =
                previousReactions
            }),
          )
        }
      }, 0)
    },

    /**
     * Add a reaction to a message.
     *
     * This method adds a new reaction to a message's reactions array
     * using optimistic updates for instant UI feedback.
     *
     * Workflow:
     * 1. Checks canAddReaction permission
     * 2. Finds message in state
     * 3. Appends reaction to existing reactions
     * 4. Calls updateMessageReactions for optimistic update
     *
     * @param message - Message to add reaction to
     * @param room - Room containing the message
     * @param reaction - Reaction object with emoji and userId
     */
    async addReactionToMessage(
      message: Message,
      room: Room,
      reaction: Reaction,
    ) {
      if (!ditto || !userId) {
        return
      }

      // Check add reaction permission
      if (!_get().canPerformAction('canAddReaction')) {
        console.warn('Permission denied: canAddReaction is false')
        return
      }

      const roomMessages = _get().messagesByRoom[room._id]
      const messageIndex = roomMessages.findIndex((m) => m.id === message._id)
      if (messageIndex === -1) {
        throw new Error('Message not found')
      }

      const originalMessage = roomMessages[messageIndex].message
      const reactions = [...(originalMessage.reactions || []), reaction]
      await _get().updateMessageReactions(originalMessage, room, reactions)
    },

    /**
     * Remove a reaction from a message.
     *
     * This method removes a user's reaction from a message using
     * optimistic updates for instant UI feedback.
     *
     * Workflow:
     * 1. Checks canRemoveOwnReaction permission
     * 2. Finds message in state
     * 3. Filters out matching reaction (emoji + userId)
     * 4. Calls updateMessageReactions for optimistic update
     *
     * @param message - Message to remove reaction from
     * @param room - Room containing the message
     * @param reaction - Reaction to remove (matched by emoji and userId)
     */
    async removeReactionFromMessage(
      message: Message,
      room: Room,
      reaction: Reaction,
    ) {
      if (!ditto || !userId) {
        return
      }

      // Check remove reaction permission
      if (!_get().canPerformAction('canRemoveOwnReaction')) {
        console.warn('Permission denied: canRemoveOwnReaction is false')
        return
      }

      const roomMessages = _get().messagesByRoom[room._id]
      const messageIndex = roomMessages.findIndex((m) => m.id === message._id)
      if (messageIndex === -1) {
        throw new Error('Message not found')
      }

      const originalMessage = roomMessages[messageIndex].message
      const reactions = (originalMessage.reactions || []).filter(
        (r) => !(r.emoji === reaction.emoji && r.userId === reaction.userId),
      )
      await _get().updateMessageReactions(originalMessage, room, reactions)
    },
  }

  return store
}

// Helper functions
async function createThumbnail(file: File): Promise<HTMLCanvasElement> {
  const image = await fileToImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2D context')
  }

  let { width, height } = image
  if (width > height) {
    height = (THUMBNAIL_MAX_SIZE / width) * height
    width = THUMBNAIL_MAX_SIZE
  } else {
    width = (THUMBNAIL_MAX_SIZE / height) * width
    height = THUMBNAIL_MAX_SIZE
  }

  canvas.width = width
  canvas.height = height
  ctx.drawImage(image, 0, 0, width, height)

  return canvas
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = String(e.target?.result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function imageToBlob(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const convertToBlob = (canvas: HTMLCanvasElement) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('Failed to convert to blob')),
        'image/jpeg',
        1.0,
      )
    }

    if (image instanceof HTMLCanvasElement) {
      convertToBlob(image)
    } else {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get 2D context'))
        return
      }
      ctx.drawImage(image, 0, 0)
      convertToBlob(canvas)
    }
  })
}

function createAttachmentMetadata(
  userId: string,
  username: string,
  type: 'thumbnail' | 'large' | 'file',
  file: File,
): Record<string, string> {
  const timestamp = new Date().toISOString()
  const cleanName = username.replace(/\s/g, '-')
  const cleanTimestamp = timestamp.replace(/:/g, '-')
  const fileExtension =
    type === 'file' ? file.name.split('.').pop() || 'bin' : 'jpg'
  const filename = `${cleanName}_${type}_${cleanTimestamp}.${fileExtension}`

  return {
    filename,
    userId,
    username,
    fileformat: `.${fileExtension}`,
    filesize: file.size.toString(),
    timestamp,
    originalName: file.name,
  }
}
