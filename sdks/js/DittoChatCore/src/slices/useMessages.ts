import {
  Attachment,
  AttachmentToken,
  StoreObserver,
  SyncSubscription,
} from "@dittolive/ditto";
import { produce, WritableDraft, castDraft } from "immer";
import { v4 as uuidv4 } from "uuid";
import Message, { Reaction, Mention } from "../types/Message";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice } from "../useChat";
import MessageWithUser from "../types/MessageWithUser";


export interface MessageSlice {
  messagesByRoom: Record<string, MessageWithUser[]>;
  messageObserversByRoom: Record<string, StoreObserver | null>;
  messageSubscriptionsByRoom: Record<string, SyncSubscription | null>;
  messagesLoading: boolean;
  messagesPublisher: (room: Room, retentionDays?: number) => Promise<void>;
  createMessage: (
    room: Room,
    text: string,
    mentions?: Mention[],
  ) => Promise<void>;
  saveEditedTextMessage: (message: Message, room: Room) => Promise<void>;
  saveDeletedMessage: (
    message: Message,
    room: Room,
    type?: "text" | "image" | "file",
  ) => Promise<void>;
  createImageMessage: (
    room: Room,
    imageFile: File,
    text?: string,
  ) => Promise<void>;
  createFileMessage: (room: Room, file: File, text?: string) => Promise<void>;
  fetchAttachment: (
    token: AttachmentToken,
    onProgress: (progress: number) => void,
    onComplete: (result: AttachmentResult) => void,
  ) => void;
  notificationHandler: ((message: MessageWithUser, room: Room) => void) | null;
  registerNotificationHandler: (
    handler: (message: MessageWithUser, room: Room) => void,
  ) => void;
  updateMessageReactions: (
    message: Message,
    room: Room,
    reactions: Reaction[],
  ) => Promise<void>;
  addReactionToMessage: (
    message: Message,
    room: Room,
    reaction: Reaction,
  ) => Promise<void>;
  removeReactionFromMessage: (
    message: Message,
    room: Room,
    reaction: Reaction,
  ) => Promise<void>;
}

interface AttachmentResult {
  success: boolean;
  data?: Uint8Array;
  metadata?: Record<string, string>;
  error?: Error;
}

const DEFAULT_RETENTION_DAYS = 30;
const MESSAGE_RECENCY_THRESHOLD = 10000; // 10 seconds
const THUMBNAIL_MAX_SIZE = 282;

export const createMessageSlice: CreateSlice<MessageSlice> = (
  _set,
  _get,
  { ditto, userId, userCollectionKey, retentionDays: globalRetentionDays, notificationHandler }
) => {
  /**
   * Retrieves the latest room data from the Ditto database.
   * 
   * This helper function fetches fresh room details:
   * 
   * 1. **Validation**:
   *    - Checks if Ditto instance is available
   *    - Throws error if Ditto is not initialized
   * 
   * 2. **Query Execution**:
   *    - Queries the appropriate collection (rooms or dm_rooms)
   *    - Uses parameterized query to fetch room by ID
   *    - Ensures secure database access
   * 
   * 3. **Result Validation**:
   *    - Throws error if room is not found
   *    - Returns the room value from the query result
   * 
   * This approach ensures:
   * - Always working with fresh room data
   * - Proper error handling for missing rooms
   * - Type-safe room retrieval
   * 
   * @param room - Room object containing _id and collectionId
   * @returns Promise resolving to the fresh Room data
   * @throws Error if Ditto is not initialized or room not found
   */
  const getRoomDetails = async (room: Room) => {
    if (!ditto) { throw new Error("Ditto not initialized"); }

    const result = await ditto.store.execute<Room>(
      `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
      { id: room._id },
    );

    if (result.items.length === 0) { throw new Error("Room not found"); }
    return result.items[0].value;
  };

  /**
   * Retrieves the current user's data for message attribution.
   * 
   * This helper function fetches user details from the database:
   * 
   * 1. **Validation**:
   *    - Checks if Ditto instance and userId are available
   *    - Throws error if prerequisites are not met
   * 
   * 2. **Query Execution**:
   *    - Queries the user collection by userId
   *    - Retrieves user document with name and other properties
   * 
   * 3. **Result Formatting**:
   *    - Returns object with id and name
   *    - Falls back to userId as name if user document doesn't have a name
   *    - Ensures consistent user object structure
   * 
   * This approach ensures:
   * - User information is always available for messages
   * - Graceful fallback for missing user names
   * - Type-safe user data retrieval
   * 
   * @returns Promise resolving to object with id and name properties
   * @throws Error if Ditto is not initialized or userId is missing
   */
  const getCurrentUser = async () => {
    if (!ditto || !userId) {
      throw new Error("Ditto not initialized or user not found");
    }

    const result = await ditto.store.execute<ChatUser>(
      `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
      { id: userId },
    );

    const userValue = result.items?.[0]?.value;
    return {
      id: userId,
      name: userValue?.name ?? userId,
    };
  };

  /**
   * Updates the global messagesLoading state based on room message availability.
   * 
   * This helper function manages the loading indicator:
   * 
   * 1. **State Check**:
   *    - Iterates through all rooms in state
   *    - Checks if each room has messages loaded in messagesByRoom
   * 
   * 2. **Loading Determination**:
   *    - Sets messagesLoading to true if any room is missing messages
   *    - Sets messagesLoading to false if all rooms have messages loaded
   * 
   * 3. **Immutable Update**:
   *    - Uses Immer's produce for safe state mutation
   *    - Ensures predictable state updates
   * 
   * This approach ensures:
   * - Loading indicator reflects actual message loading state
   * - UI shows loading only when necessary
   * - Accurate feedback for users
   */
  const updateMessageLoadingState = () => {
    _set((state: ChatStore) => {
      return produce(state, (draft) => {
        draft.messagesLoading = !draft.rooms.every(
          (room) => room._id in draft.messagesByRoom,
        );
      });
    });
  };

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
    };

    const mutableMessage = castDraft({
      ...messageWithUser,
      message: messageWithUser.message,
      user: messageWithUser.user,
    });
    // Check for notifications on new messages
    const existingIndex = stateMessages.findIndex((m) => m.id === message._id);

    if (
      existingIndex === -1 &&
      !message.archivedMessage &&
      shouldNotify(message, room) && notificationHandler
    ) {
      // Trigger notification handler if registered (for browser notifications and toasts)
      // _get().notificationHandler?.({ message, user, id: message._id }, room);

      // Trigger toast notification if not viewing this room
      const activeRoomId = _get().activeRoomId;
      if (activeRoomId !== room._id) {
        const senderName = user?.name || "Unknown User";
        const roomName = room.name;
        const isDM = room.collectionId === "dm_rooms";

        const title = isDM
          ? `New message from ${senderName}`
          : `#${roomName}: ${senderName}`;

        const preview = message.text
          ? message.text.substring(0, 30) +
          (message.text.length > 30 ? "..." : "")
          : "Sent an attachment";

        notificationHandler(title, preview)
      }
    }


    // Handle edited messages
    if (message.archivedMessage) {
      const originalIndex = stateMessages.findIndex(
        (m) => m.id === message.archivedMessage,
      );

      if (originalIndex !== -1) {
        stateMessages[originalIndex] = mutableMessage;
      } else if (existingIndex === -1) {
        stateMessages.push(mutableMessage);
      } else {
        stateMessages[existingIndex] = mutableMessage;
      }
    } else {
      // Handle new/updated messages
      if (existingIndex === -1) {
        stateMessages.push(mutableMessage);
      } else {
        stateMessages[existingIndex] = mutableMessage;
      }
    }
  };

  // Helper: Check if should notify user
  const shouldNotify = (message: Message, room: Room) => {
    const currentState = _get();
    const currentUser = currentState.currentUser;

    const isOwnMessage = message.userId === currentUser?._id;
    const isRecent =
      new Date(message.createdOn).getTime() >
      Date.now() - MESSAGE_RECENCY_THRESHOLD;
    const isSubscribed = currentUser?.subscriptions?.[room._id];
    const isMentioned = message.mentions?.some(
      (mention) => mention.userId === currentUser?._id,
    );
    const isDM = room.collectionId === "dm_rooms";

    return !isOwnMessage && isRecent && (isSubscribed || isDM || isMentioned);
  };

  // Helper: Create a message document
  const createMessageDocument = async (
    room: Room,
    messageData: Partial<Message> & { text: string },
    collectionSpec: string = "",
  ) => {
    if (!ditto || !userId) {
      throw new Error("Ditto not initialized or user not found");
    }

    const actualRoom = await getRoomDetails(room);
    const id = messageData._id || uuidv4();
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
    };

    const collectionClause = collectionSpec
      ? `COLLECTION ${actualRoom.messagesId} ${collectionSpec}`
      : actualRoom.messagesId;
    await ditto.store.execute(
      `INSERT INTO ${collectionClause} DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`,
      { newDoc },
    );
    if (messageData.mentions && messageData.mentions.length > 0) {
      // Update user mentions
      const users = _get().allUsers;
      await Promise.all(
        messageData.mentions.map((mention) => {
          const user = users.find((u: ChatUser) => u._id === mention.userId);
          if (!user) { return; }

          const userMentions = {
            ...(user.mentions || {}),
            [room._id]: [...(user.mentions?.[room._id] || []), id],
          };

          return ditto.store.execute(
            `UPDATE users SET mentions = :mentions WHERE _id = :id`,
            { id: user._id, mentions: userMentions },
          );
        }),
      );
    }

    return newDoc;
  };

  // Helper: Archive and create new message (for edits/deletes)
  const archiveAndCreateMessage = async (
    message: Message,
    room: Room,
    newMessageData: Partial<Message>,
  ) => {
    if (!ditto) { throw new Error("Ditto not initialized"); }

    await ditto.store.execute(
      `UPDATE ${room.messagesId} SET isArchived = :isArchived WHERE _id = :id`,
      { id: message._id, isArchived: true },
    );

    return createMessageDocument(room, {
      text: "",
      createdOn: message.createdOn,
      archivedMessage: message._id,
      ...newMessageData,
    });
  };

  // Helper: Create attachment message (unified for images and files)
  const createAttachmentMessage = async (
    room: Room,
    file: File,
    text: string | undefined,
    attachmentType: "image" | "file",
  ) => {
    if (!ditto || !userId) {
      throw new Error("Ditto not initialized or user not found");
    }

    const user = await getCurrentUser();
    const attachments: Record<string, Attachment | null> = {
      thumbnailImageToken: null,
      largeImageToken: null,
      fileAttachmentToken: null,
    };

    if (attachmentType === "image") {
      const thumbnailImage = await createThumbnail(file);
      const thumbnailBlob = await imageToBlob(thumbnailImage);
      const thumbnailData = new Uint8Array(await thumbnailBlob.arrayBuffer());
      attachments.thumbnailImageToken = await ditto.store.newAttachment(
        thumbnailData,
        createAttachmentMetadata(user.id, user.name, "thumbnail", file),
      );

      const largeImageBlob = await imageToBlob(await fileToImage(file));
      const largeImageData = new Uint8Array(await largeImageBlob.arrayBuffer());
      attachments.largeImageToken = await ditto.store.newAttachment(
        largeImageData,
        createAttachmentMetadata(user.id, user.name, "large", file),
      );
    } else {
      const fileData = new Uint8Array(await file.arrayBuffer());
      attachments.fileAttachmentToken = await ditto.store.newAttachment(
        fileData,
        createAttachmentMetadata(user.id, user.name, "file", file),
      );
    }

    const collectionSpec =
      attachmentType === "image"
        ? "(thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT)"
        : "(fileAttachmentToken ATTACHMENT)";

    await createMessageDocument(
      room,
      {
        text: text || (attachmentType === "file" ? file.name : ""),
        ...attachments,
      },
      collectionSpec,
    );
  };

  const store: MessageSlice = {
    messagesLoading: true,
    messagesByRoom: {},
    messageObserversByRoom: {},
    messageSubscriptionsByRoom: {},
    notificationHandler: null,

    /**
     * Registers a notification handler for new messages.
     * 
     * This function allows the UI layer to provide a custom notification handler
     * that will be called whenever a new message arrives that meets notification criteria.
     * 
     * The handler receives formatted notification data including title and preview text,
     * enabling the UI to display toast notifications, browser notifications, or other alerts.
     * 
     * @param handler - Callback function that receives (title: string, preview: string)
     */
    registerNotificationHandler(handler) {
      _set({ notificationHandler: handler });
    },

    /**
     * Sets up real-time message synchronization for a room.
     * 
     * This function establishes a Ditto subscription and observer for a specific room's messages.
     * The workflow includes:
     * 
     * 1. **Validation and Deduplication**:
     *    - Checks if Ditto is initialized
     *    - Returns early if subscription already exists for this room
     *    - Prevents duplicate subscriptions
     * 
     * 2. **Retention Configuration**:
     *    - Determines effective retention days from multiple sources:
     *      - Function parameter (highest priority)
     *      - Room-specific retention setting
     *      - Global retention configuration
     *      - DEFAULT_RETENTION_DAYS (30 days fallback)
     *    - Calculates retention date for filtering old messages
     * 
     * 3. **Query Construction**:
     *    - Builds query for non-archived messages newer than retention date
     *    - Includes attachment tokens for image and file attachments
     *    - Orders messages chronologically
     * 
     * 4. **Subscription Registration**:
     *    - Registers Ditto sync subscription for real-time updates
     *    - Registers observer to handle incoming message events
     *    - Stores subscription and observer references in state
     * 
     * 5. **Message Processing**:
     *    - Merges user data with messages (MessageWithUser)
     *    - Updates state immutably using Immer
     *    - Triggers loading state update
     *    - Handles message notifications appropriately
     * 
     * This approach ensures:
     * - Automatic real-time message synchronization
     * - Configurable message retention policies
     * - Efficient state management with user attribution
     * - No duplicate subscriptions
     * 
     * @param room - Room to subscribe to for messages
     * @param retentionDays - Optional override for message retention period
     */
    async messagesPublisher(room: Room, retentionDays?: number) {
      if (!ditto) { return; }

      const roomId = room._id;
      if (_get().messageSubscriptionsByRoom[roomId]) { return; }

      const effectiveRetentionDays =
        retentionDays ??
        room.retentionDays ??
        globalRetentionDays ??
        DEFAULT_RETENTION_DAYS;

      const retentionDate = new Date(
        Date.now() - effectiveRetentionDays * 24 * 60 * 60 * 1000
      );
      const query = `SELECT * FROM COLLECTION ${room.messagesId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT, fileAttachmentToken ATTACHMENT)
        WHERE roomId = :roomId AND createdOn >= :date AND isArchived = false
        ORDER BY createdOn ASC`;

      const args = {
        roomId: room._id,
        date: retentionDate.toISOString(),
      };

      try {
        const subscription = ditto.sync.registerSubscription(query, args);
        const allUsers = _get().allUsers;

        const observer = ditto.store.registerObserver<Message>(
          query,
          async (result) => {
            // Update all messages at single time on state
            _set((state: ChatStore) => {
              return produce(state, (draft) => {
                if (!draft.messagesByRoom[room._id]) {
                  draft.messagesByRoom[room._id] = [];
                }
                if (result.items.length === 0) { return draft; }

                for (const item of result.items) {
                  const message = item.value;
                  const messagesByRoom = draft.messagesByRoom[room._id];
                  const user = allUsers.find((u) => u._id === message.userId);
                  // update message on the store
                  handleMessageUpdate(messagesByRoom, room, message, user);
                }
                return draft;
              });
            });
            updateMessageLoadingState();
          },
          args,
        );

        _set({
          messageSubscriptionsByRoom: {
            ..._get().messageSubscriptionsByRoom,
            [roomId]: subscription,
          },
          messageObserversByRoom: {
            ..._get().messageObserversByRoom,
            [roomId]: observer,
          },
        });
      } catch (err) {
        console.error("Error in messagesPublisher:", err);
      }
    },

    /**
     * Creates a new text message in a room with optional user mentions.
     * 
     * This function creates a new message with mention support:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto and userId are available
     *    - Returns early if prerequisites are not met
     * 
     * 2. **RBAC Permission Check**:
     *    - Verifies user has "canMentionUsers" permission if mentions provided
     *    - Filters out mentions if permission is denied
     *    - Logs warning for permission violations
     * 
     * 3. **Message Creation**:
     *    - Delegates to createMessageDocument helper
     *    - Includes filtered mentions based on permissions
     *    - Automatically updates mentioned users' mention records
     * 
     * This approach ensures:
     * - RBAC integration for mention permissions
     * - Graceful handling of permission denials
     * - Automatic mention tracking in user documents
     * 
     * @param room - Room to create the message in
     * @param text - Message text content
     * @param mentions - Optional array of user mentions with positions
     */
    async createMessage(room: Room, text: string, mentions: Mention[] = []) {
      if (!ditto || !userId) { return; }

      // Check mention permission if mentions are provided
      const hasMentionPermission = _get().canPerformAction("canMentionUsers");
      const filteredMentions = mentions.length > 0 && !hasMentionPermission
        ? []
        : mentions;

      if (mentions.length > 0 && !hasMentionPermission) {
        console.warn("Permission denied: canMentionUsers is false");
      }

      try {
        await createMessageDocument(room, {
          text,
          mentions: filteredMentions,
        });
      } catch (err) {
        console.error("Error in createMessage:", err);
      }
    },

    /**
     * Saves an edited version of a message using the archive-and-create pattern.
     * 
     * This function implements message editing with history preservation:
     * 
     * 1. **Permission Check**:
     *    - Verifies user has "canEditOwnMessage" permission via RBAC
     *    - Returns early and logs warning if permission denied
     * 
     * 2. **Archive and Create Pattern**:
     *    - Archives the original message (sets isArchived=true)
     *    - Creates a new message with updated content
     *    - Links new message to archived original via archivedMessage field
     *    - Preserves creation timestamp, attachments, mentions, and reactions
     * 
     * 3. **Metadata Marking**:
     *    - Sets isEdited=true on the new message
     *    - Ensures isDeleted=false
     *    - Maintains message history for audit purposes
     * 
     * This approach ensures:
     * - RBAC integration for edit permissions
     * - Complete edit history preservation
     * - Original messages remain in database for auditing
     * - UI can show "edited" indicator
     * 
     * @param message - Message to edit (with updated text)
     * @param room - Room containing the message
     */
    async saveEditedTextMessage(message: Message, room: Room) {
      // Check edit permission
      if (!_get().canPerformAction("canEditOwnMessage")) {
        console.warn("Permission denied: canEditOwnMessage is false");
        return;
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
        });
      } catch (err) {
        console.error("Error in saveEditedTextMessage:", err);
      }
    },

    /**
     * Marks a message as deleted using the archive-and-create pattern.
     * 
     * This function implements message deletion with history preservation:
     * 
     * 1. **Permission Check**:
     *    - Verifies user has "canDeleteOwnMessage" permission via RBAC
     *    - Returns early and logs warning if permission denied
     * 
     * 2. **Type-Specific Deletion Text**:
     *    - Uses "[deleted message]" for text messages
     *    - Uses "[deleted image]" for image messages
     *    - Uses "[deleted file]" for file messages
     *    - Provides clear indication of deleted content type
     * 
     * 3. **Archive and Create Pattern**:
     *    - Archives the original message (sets isArchived=true)
     *    - Creates a new message with deletion placeholder text
     *    - Removes all attachments (images, files)
     *    - Clears all mentions
     *    - Links to original via archivedMessage field
     * 
     * 4. **Metadata Marking**:
     *    - Sets isDeleted=true on the new message
     *    - Updates createdOn to deletion timestamp
     *    - Preserves message history for compliance/auditing
     * 
     * This approach ensures:
     * - RBAC integration for delete permissions
     * - Soft deletion with history preservation
     * - Attachment cleanup while maintaining record
     * - UI shows deletion placeholder
     * 
     * @param message - Message to delete
     * @param room - Room containing the message
     * @param type - Type of message being deleted ("text", "image", or "file")
     */
    async saveDeletedMessage(
      message: Message,
      room: Room,
      type: "text" | "image" | "file" = "text",
    ) {
      // Check delete permission
      if (!_get().canPerformAction("canDeleteOwnMessage")) {
        console.warn("Permission denied: canDeleteOwnMessage is false");
        return;
      }

      const deletedText = {
        text: "[deleted message]",
        image: "[deleted image]",
        file: "[deleted file]",
      }[type];

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
        });
      } catch (err) {
        console.error("Error in saveDeletedMessage:", err);
      }
    },

    /**
     * Creates a new message with an image attachment.
     * 
     * This function handles image message creation with automatic processing:
     * 
     * 1. **Image Processing**:
     *    - Creates a thumbnail (max 282px) for fast preview loading
     *    - Stores full-size image for detailed viewing
     *    - Converts images to JPEG format for consistency
     * 
     * 2. **Attachment Storage**:
     *    - Stores both thumbnail and large image as Ditto attachments
     *    - Includes metadata (filename, size, timestamp, user info)
     *    - Uses ATTACHMENT collection specification for proper sync
     * 
     * 3. **Message Creation**:
     *    - Delegates to createAttachmentMessage helper
     *    - Optional caption text can be included
     *    - Automatically links attachments to message document
     * 
     * This approach ensures:
     * - Optimized image loading (thumbnail first, then full size)
     * - Consistent image format across the application
     * - Proper metadata for attachment management
     * 
     * @param room - Room to create the image message in
     * @param imageFile - Image file to attach
     * @param text - Optional caption text for the image
     */
    async createImageMessage(room: Room, imageFile: File, text?: string) {
      try {
        await createAttachmentMessage(room, imageFile, text, "image");
      } catch (err) {
        console.error("Error in createImageMessage:", err);
      }
    },

    /**
     * Creates a new message with a file attachment.
     * 
     * This function handles file message creation:
     * 
     * 1. **File Storage**:
     *    - Stores file as a Ditto attachment
     *    - Preserves original file format and name
     *    - Includes metadata (filename, size, timestamp, user info)
     * 
     * 2. **Attachment Storage**:
     *    - Uses ATTACHMENT collection specification for proper sync
     *    - Single attachment token (no thumbnails for files)
     *    - Enables file download functionality in UI
     * 
     * 3. **Message Creation**:
     *    - Delegates to createAttachmentMessage helper
     *    - Uses filename as fallback text if no caption provided
     *    - Automatically links attachment to message document
     * 
     * This approach ensures:
     * - Support for any file type
     * - Preservation of original file metadata
     * - Consistent attachment handling across the SDK
     * 
     * @param room - Room to create the file message in
     * @param file - File to attach
     * @param text - Optional caption text (defaults to filename)
     */
    async createFileMessage(room: Room, file: File, text?: string) {
      try {
        await createAttachmentMessage(room, file, text, "file");
      } catch (err) {
        console.error("Error in createFileMessage:", err);
      }
    },

    /**
     * Fetches an attachment from Ditto with progress tracking.
     * 
     * This function provides a callback-based API for downloading attachments:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto is initialized
     *    - Validates attachment token is provided
     *    - Calls onComplete with error if validation fails
     * 
     * 2. **Progress Tracking**:
     *    - Calls onProgress callback with download progress (0.0 to 1.0)
     *    - Calculates progress from downloadedBytes / totalBytes
     *    - Enables UI to show loading indicators
     * 
     * 3. **Event Handling**:
     *    - **Progress**: Reports download progress
     *    - **Completed**: Extracts attachment data and metadata, calls onComplete with success
     *    - **Deleted**: Calls onComplete with error if attachment was deleted
     * 
     * 4. **Data Extraction**:
     *    - Handles both Promise and direct data results
     *    - Returns Uint8Array data suitable for display/download
     *    - Includes metadata (filename, size, etc.)
     * 
     * This approach ensures:
     * - User feedback during long downloads
     * - Proper error handling for missing/deleted attachments
     *    - Type-safe attachment data retrieval
     * 
     * @param token - AttachmentToken from the message
     * @param onProgress - Callback receiving progress (0.0 to 1.0)
     * @param onComplete - Callback receiving AttachmentResult on completion or error
     */
    fetchAttachment(token, onProgress, onComplete) {
      if (!ditto) {
        onComplete({
          success: false,
          error: new Error("Ditto not initialized"),
        });
        return;
      }

      if (!token) {
        onComplete({
          success: false,
          error: new Error("No attachment token provided"),
        });
        return;
      }

      try {
        ditto.store.fetchAttachment(token, async (event) => {
          switch (event.type) {
            case "Progress": {
              const progress =
                Number(event.downloadedBytes) / (Number(event.totalBytes) || 1);
              onProgress(progress);
              break;
            }

            case "Completed":
              try {
                const dataResult = event.attachment.getData();
                const data =
                  dataResult instanceof Promise ? await dataResult : dataResult;
                onComplete({
                  success: true,
                  data,
                  metadata: event.attachment.metadata || {},
                });
              } catch (error) {
                onComplete({
                  success: false,
                  error:
                    error instanceof Error
                      ? error
                      : new Error("Unknown error getting attachment data"),
                });
              }
              break;

            case "Deleted":
              onComplete({
                success: false,
                error: new Error("Attachment was deleted"),
              });
              break;
          }
        });
      } catch (error) {
        onComplete({
          success: false,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to fetch attachment"),
        });
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
      if (!ditto || !userId) { return; }

      const roomId = room._id;
      const roomMessages = _get().messagesByRoom[roomId] || [];
      const index = roomMessages.findIndex((m) => m.id === message._id);

      if (index === -1) { throw new Error("Message not found"); }

      const originalMessage = roomMessages[index].message;
      const previousReactions = originalMessage.reactions || [];

      // Phase 1: Optimistic update - immediately update UI state
      // This provides instant feedback to the user without waiting for DB operations
      _set((state: ChatStore) =>
        produce(state, (draft) => {
          draft.messagesByRoom[roomId][index].message.reactions = reactions;
        }),
      );

      // Phase 2: Async DB persistence with automatic rollback on failure
      // Using setTimeout(0) to defer DB operations without blocking the UI
      setTimeout(async () => {
        try {
          await ditto.store.execute(
            `UPDATE ${room.messagesId} SET reactions = :reactions WHERE _id = :id`,
            { id: originalMessage._id, reactions },
          );
        } catch (err) {
          // Rollback: Restore previous state if DB update fails
          console.error("Error updating reactions, rolling back:", err);
          _set((state: ChatStore) =>
            produce(state, (draft) => {
              draft.messagesByRoom[roomId][index].message.reactions =
                previousReactions;
            }),
          );
        }
      }, 0);
    },

    /**
     * Adds a reaction to a message with RBAC permission checking.
     * 
     * This function implements reaction addition with permission control:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto and userId are available
     *    - Returns early if prerequisites are not met
     * 
     * 2. **Permission Check**:
     *    - Verifies user has "canAddReaction" permission via RBAC
     *    - Returns early and logs warning if permission denied
     *    - Prevents unauthorized reactions
     * 
     * 3. **Message Lookup**:
     *    - Finds the message in the room's message list
     *    - Throws error if message is not found
     * 
     * 4. **Reaction Addition**:
     *    - Appends new reaction to existing reactions array
     *    - Delegates to updateMessageReactions for optimistic update
     *    - Note: Does not check for duplicate reactions (allows multiple reactions per user)
     * 
     * This approach ensures:
     * - RBAC integration for reaction permissions
     * - Optimistic UI updates via updateMessageReactions
     * - Consistent reaction handling across the SDK
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
      if (!ditto || !userId) { return; }

      // Check add reaction permission
      if (!_get().canPerformAction("canAddReaction")) {
        console.warn("Permission denied: canAddReaction is false");
        return;
      }

      const roomMessages = _get().messagesByRoom[room._id];
      const messageIndex = roomMessages.findIndex((m) => m.id === message._id);
      if (messageIndex === -1) { throw new Error("Message not found"); }

      const originalMessage = roomMessages[messageIndex].message;
      const reactions = [...(originalMessage.reactions || []), reaction];
      await _get().updateMessageReactions(originalMessage, room, reactions);
    },

    /**
     * Removes a reaction from a message with RBAC permission checking.
     * 
     * This function implements reaction removal with permission control:
     * 
     * 1. **Validation**:
     *    - Checks if Ditto and userId are available
     *    - Returns early if prerequisites are not met
     * 
     * 2. **Permission Check**:
     *    - Verifies user has "canRemoveOwnReaction" permission via RBAC
     *    - Returns early and logs warning if permission denied
     *    - Prevents unauthorized reaction removal
     * 
     * 3. **Message Lookup**:
     *    - Finds the message in the room's message list
     *    - Throws error if message is not found
     * 
     * 4. **Reaction Removal**:
     *    - Filters reactions array to remove matching emoji+userId combination
     *    - Ensures only the specific user's reaction is removed
     *    - Delegates to updateMessageReactions for optimistic update
     * 
     * This approach ensures:
     * - RBAC integration for reaction removal permissions
     * - Users can only remove their own reactions
     * - Optimistic UI updates via updateMessageReactions
     * - Consistent reaction handling across the SDK
     * 
     * @param message - Message to remove reaction from
     * @param room - Room containing the message
     * @param reaction - Reaction object with emoji and userId to remove
     */
    async removeReactionFromMessage(
      message: Message,
      room: Room,
      reaction: Reaction,
    ) {
      if (!ditto || !userId) { return; }

      // Check remove reaction permission
      if (!_get().canPerformAction("canRemoveOwnReaction")) {
        console.warn("Permission denied: canRemoveOwnReaction is false");
        return;
      }

      const roomMessages = _get().messagesByRoom[room._id];
      const messageIndex = roomMessages.findIndex((m) => m.id === message._id);
      if (messageIndex === -1) { throw new Error("Message not found"); }

      const originalMessage = roomMessages[messageIndex].message;
      const reactions = (originalMessage.reactions || []).filter(
        (r) => !(r.emoji === reaction.emoji && r.userId === reaction.userId),
      );
      await _get().updateMessageReactions(originalMessage, room, reactions);
    },
  };

  return store;
};

// Helper functions
async function createThumbnail(file: File): Promise<HTMLCanvasElement> {
  const image = await fileToImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) { throw new Error("Failed to get 2D context"); }

  let { width, height } = image;
  if (width > height) {
    height = (THUMBNAIL_MAX_SIZE / width) * height;
    width = THUMBNAIL_MAX_SIZE;
  } else {
    width = (THUMBNAIL_MAX_SIZE / height) * width;
    height = THUMBNAIL_MAX_SIZE;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = String(e.target?.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function imageToBlob(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const convertToBlob = (canvas: HTMLCanvasElement) => {
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Failed to convert to blob")),
        "image/jpeg",
        1.0,
      );
    };

    if (image instanceof HTMLCanvasElement) {
      convertToBlob(image);
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2D context"));
        return;
      }
      ctx.drawImage(image, 0, 0);
      convertToBlob(canvas);
    }
  });
}

function createAttachmentMetadata(
  userId: string,
  username: string,
  type: "thumbnail" | "large" | "file",
  file: File,
): Record<string, string> {
  const timestamp = new Date().toISOString();
  const cleanName = username.replace(/\s/g, "-");
  const cleanTimestamp = timestamp.replace(/:/g, "-");
  const fileExtension =
    type === "file" ? file.name.split(".").pop() || "bin" : "jpg";
  const filename = `${cleanName}_${type}_${cleanTimestamp}.${fileExtension}`;

  return {
    filename,
    userId,
    username,
    fileformat: `.${fileExtension}`,
    filesize: file.size.toString(),
    timestamp,
    originalName: file.name,
  };
}
