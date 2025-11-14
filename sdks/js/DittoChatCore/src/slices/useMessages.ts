import {
  AttachmentToken,
  StoreObserver,
  SyncSubscription,
} from "@dittolive/ditto";
import { produce, WritableDraft } from "immer";
import Message, { Reaction } from "../types/Message";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice, DittoConfParams } from "../useChat";
import MessageWithUser from "../types/MessageWithUser";

export interface MessageSlice {
  // Messages state organized by roomId
  messagesByRoom: Record<string, MessageWithUser[]>;
  messageObserversByRoom: Record<string, StoreObserver | null>;
  messageSubscriptionsByRoom: Record<string, SyncSubscription | null>;

  // Methods
  messagesPublisher: (room: Room, retentionDays?: number) => Promise<void>;
  createMessage: (room: Room, text: string) => Promise<void>;
  saveEditedTextMessage: (message: Message, room: Room) => Promise<void>;
  saveDeletedImageMessage: (
    message: Message,
    room: Room,
    type?: "text" | "image" | "file"
  ) => Promise<void>;
  createImageMessage: (
    room: Room,
    imageFile: File,
    text?: string
  ) => Promise<void>;
  createFileMessage: (room: Room, file: File, text?: string) => Promise<void>;
  fetchAttachment: (
    token: AttachmentToken,
    onProgress: (progress: number) => void,
    onComplete: (result: {
      success: boolean;
      data?: Uint8Array;
      metadata?: Record<string, string>;
      error?: Error;
    }) => void
  ) => void;
  notificationHandler: ((message: MessageWithUser, room: Room) => void) | null;
  registerNotificationHandler: (
    handler: (message: MessageWithUser, room: Room) => void
  ) => void;
  updateMessageReactions: (
    message: Message,
    room: Room,
    reactions: Reaction[]
  ) => Promise<void>;
  addReactionToMessage: (
    message: Message,
    room: Room,
    reaction: Reaction
  ) => Promise<void>;
  removeReactionFromMessage: (
    message: Message,
    room: Room,
    reaction: Reaction
  ) => Promise<void>;
}

interface ChatRetentionPolicy {
  days: number;
}

export const createMessageSlice: CreateSlice<MessageSlice> = (
  _set,
  _get,
  { ditto, userId, userCollectionKey }: DittoConfParams
) => {
  const chatRetentionPolicy: ChatRetentionPolicy = { days: 30 };

  const store: MessageSlice = {
    messagesByRoom: {},
    messageObserversByRoom: {},
    messageSubscriptionsByRoom: {},
    notificationHandler: null,
    registerNotificationHandler(handler) {
      _set({ notificationHandler: handler });
    },

    async messagesPublisher(room: Room, retentionDays?: number) {
      if (!ditto) return;

      const roomId = room._id;
      const collectionId = room.messagesId;

      // If already subscribed, skip
      if (_get().messageSubscriptionsByRoom[roomId]) {
        return;
      }

      const retentionDaysValue = retentionDays ?? chatRetentionPolicy.days;
      const retentionDaysAgo = new Date(
        Date.now() - retentionDaysValue * 24 * 60 * 60 * 1000
      );

      const query = `SELECT * FROM COLLECTION ${collectionId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT, fileAttachmentToken ATTACHMENT)
        WHERE roomId = :roomId
        AND createdOn >= :date
        AND isArchived = false
        ORDER BY createdOn ASC`;

      const args = {
        roomId: room._id,
        date: retentionDaysAgo.toISOString(),
        dateMs: retentionDaysAgo.getTime(),
      };

      try {
        // Register subscription
        const subscription = ditto.sync.registerSubscription(query, args);
        const allUsers = _get().allUsers;

        // Register observer
        const observer = ditto.store.registerObserver<Message>(
          query,
          async (result) => {
            _set((state: ChatStore) => {
              return produce(state, (draft) => {
                if (!draft.messagesByRoom[roomId]) {
                  draft.messagesByRoom[roomId] = [];
                }

                for (const item of result.items) {
                  const message = item.value;

                  const user = allUsers.find(
                    (u: ChatUser) => u._id === message.userId
                  );

                  const messageWithUser: MessageWithUser = {
                    message,
                    user,
                    id: message._id,
                  };
                  const mutableMessage = {
                    ...messageWithUser,
                    message:
                      messageWithUser.message as unknown as WritableDraft<
                        typeof messageWithUser.message
                      >,
                  };

                  // First check if this message already exists in the list
                  const existingIndex = draft.messagesByRoom[roomId]!.findIndex(
                    (m) => m.id === message._id
                  );

                  // Check if this is an edited message (has archivedMessage)
                  if (message.archivedMessage) {
                    // Find the original message's position by its ID
                    const originalIndex = draft.messagesByRoom[
                      roomId
                    ]!.findIndex((m) => m.id === message.archivedMessage);

                    if (originalIndex !== -1) {
                      // Replace the original message at its position with the edited one
                      draft.messagesByRoom[roomId][originalIndex] =
                        mutableMessage;
                    } else if (existingIndex === -1) {
                      // Original not found and this edited message doesn't exist yet - add it
                      draft.messagesByRoom[roomId]!.push(mutableMessage);
                    } else {
                      // This edited message already exists - update it in place
                      draft.messagesByRoom[roomId]![existingIndex] =
                        mutableMessage;
                    }
                  } else {
                    // Regular message handling (not an edit)
                    if (existingIndex === -1) {
                      // This is a new message. Check if we should notify.
                      const currentState = _get(); // Get fresh state for checks
                      const currentUser = currentState.currentUser;

                      // Not our own message
                      const isOwnMessage = message.userId === currentUser?._id;

                      // Is it "Live"? (e.g., created in the last 10 seconds)
                      // This prevents toasts for old messages when first loading the app.
                      const isRecent =
                        new Date(message.createdOn).getTime() >
                        Date.now() - 10000;

                      // Is user subscribed OR is it a DM
                      const isSubscribed =
                        currentUser?.subscriptions &&
                        currentUser.subscriptions[roomId];
                      const isDM = room.collectionId === "dm_rooms";

                      if (!isOwnMessage && isRecent && (isSubscribed || isDM)) {
                        // Trigger the UI handler if one is registered
                        currentState.notificationHandler?.(
                          messageWithUser,
                          room
                        );
                      }

                      // New message - add it to the list
                      draft.messagesByRoom[roomId]!.push(mutableMessage);
                    } else {
                      // Existing message - update it (handles deletes and other updates)
                      draft.messagesByRoom[roomId]![existingIndex] =
                        mutableMessage;
                    }
                  }
                }

                return draft;
              });
            });
          },
          args
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

    async createMessage(room: Room, text: string) {
      if (!ditto) return;
      if (!userId) return;

      try {
        // Fetch current user to get name
        const currentUserResult = await ditto.store.execute<Room>(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId }
        );
        const userValue = currentUserResult.items?.[0]?.value;
        const fullName = userValue?.name ?? userId;

        const roomResult = await ditto.store.execute(
          `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
          { id: room._id }
        );

        if (roomResult.items.length === 0) {
          console.error("Room not found:", room._id);
          return;
        }

        const actualRoom = roomResult.items[0].value;
        const messagesId = actualRoom.messagesId;

        const now = new Date();
        const nowIso = now.toISOString();
        const newDoc = {
          roomId: room._id,
          text,
          userId,
          createdOn: nowIso,
          isArchived: false,
          archivedMessage: null,
          largeImageToken: null,
          thumbnailImageToken: null,
          fileAttachmentToken: null,
          isEdited: false,
          isDeleted: false,
        };

        const query = `INSERT INTO ${messagesId} DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`;
        await ditto.store.execute(query, { newDoc });
      } catch (err) {
        console.error("Error in createMessage:", err);
      }
    },

    async saveEditedTextMessage(message: Message, room: Room) {
      if (!ditto) return;
      if (!userId) return;

      try {
        // Archive the original message
        const archiveQuery = `UPDATE ${room.messagesId} SET isArchived = :isArchived WHERE _id = :id`;
        await ditto.store.execute(archiveQuery, {
          id: message._id,
          isArchived: true,
        });

        // Create a new message with the edited text
        const newDoc = {
          roomId: room._id,
          text: message.text,
          userId: userId,
          createdOn: message.createdOn,
          isArchived: false,
          archivedMessage: message._id,
          largeImageToken: message.largeImageToken || null,
          thumbnailImageToken: message.thumbnailImageToken || null,
          fileAttachmentToken: message.fileAttachmentToken || null,
          isEdited: true,
          isDeleted: false,
        };

        const insertQuery = `INSERT INTO ${room.messagesId} DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`;
        await ditto.store.execute(insertQuery, { newDoc });
      } catch (err) {
        console.error("Error in saveEditedTextMessage:", err);
        throw err;
      }
    },

    async saveDeletedImageMessage(
      message: Message,
      room: Room,
      type?: "text" | "image" | "file"
    ) {
      if (!ditto) return;
      if (!userId) return;

      try {
        // Archive the original message (same as edit)
        const archiveQuery = `UPDATE ${room.messagesId} SET isArchived = :isArchived WHERE _id = :id`;
        await ditto.store.execute(archiveQuery, {
          id: message._id,
          isArchived: true,
        });

        // Create a new "deleted" message with the appropriate placeholder
        const now = new Date();
        const nowIso = now.toISOString();

        let deletedText = "[deleted message]";
        if (type === "image") {
          deletedText = "[deleted image]";
        } else if (type === "file") {
          deletedText = "[deleted file]";
        }

        const newDoc = {
          roomId: room._id,
          text: deletedText,
          userId: userId,
          createdOn: nowIso,
          isArchived: false,
          archivedMessage: message._id, // Link to the original message
          largeImageToken: null,
          thumbnailImageToken: null,
          fileAttachmentToken: null,
          isEdited: false,
          isDeleted: true, // Mark as deleted
        };

        const insertQuery = `INSERT INTO ${room.messagesId} DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`;
        await ditto.store.execute(insertQuery, { newDoc });
      } catch (err) {
        console.error("Error in saveDeletedImageMessage:", err);
        throw err;
      }
    },
    async createImageMessage(room: Room, imageFile: File, text?: string) {
      if (!ditto) throw new Error("Ditto not initialized");
      if (!userId) throw new Error("User ID not found");

      try {
        // Get current user info
        const currentUserResult = await ditto.store.execute<ChatUser>(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId }
        );
        const userValue = currentUserResult.items?.[0]?.value;
        const fullName = userValue?.name ?? userId;

        // Get room info
        const roomResult = await ditto.store.execute<Room>(
          `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
          { id: room._id }
        );

        if (roomResult.items.length === 0) {
          throw new Error("Room not found");
        }

        const actualRoom = roomResult.items[0].value;
        const messagesId = actualRoom.messagesId;

        // Generate unique document ID
        const docId =
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(16).slice(2) +
            Math.random().toString(16).slice(2);

        // Create BOTH attachments BEFORE inserting the message
        console.log("Creating thumbnail attachment...");
        const thumbnailImage = await createThumbnail(imageFile);
        const thumbnailBlob = await imageToBlob(thumbnailImage);
        const thumbnailData = new Uint8Array(await thumbnailBlob.arrayBuffer());
        const thumbnailAttachment = await ditto.store.newAttachment(
          thumbnailData,
          createAttachmentMetadata(userId, fullName, "thumbnail", imageFile)
        );

        console.log("Creating large image attachment...");
        const largeImageBlob = await imageToBlob(await fileToImage(imageFile));
        const largeImageData = new Uint8Array(
          await largeImageBlob.arrayBuffer()
        );
        const largeAttachment = await ditto.store.newAttachment(
          largeImageData,
          createAttachmentMetadata(userId, fullName, "large", imageFile)
        );

        // Now create the message document with BOTH tokens
        const now = new Date();
        const nowIso = now.toISOString();
        const newDoc = {
          _id: docId,
          createdOn: nowIso,
          roomId: room._id,
          userId,
          text: text || "",
          thumbnailImageToken: thumbnailAttachment,
          largeImageToken: largeAttachment,
          fileAttachmentToken: null,
          isArchived: false,
          archivedMessage: null,
          isEdited: false,
          isDeleted: false,
        };

        // Insert the message with BOTH attachments in a single operation
        await ditto.store.execute(
          `INSERT INTO COLLECTION ${messagesId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT) DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`,
          { newDoc }
        );

        console.log("Image message created successfully");
      } catch (err) {
        console.error("Error in createImageMessage:", err);
        throw err;
      }
    },

    async createFileMessage(room: Room, file: File, text?: string) {
      if (!ditto) throw new Error("Ditto not initialized");
      if (!userId) throw new Error("User ID not found");

      try {
        // Get current user info
        const currentUserResult = await ditto.store.execute<ChatUser>(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId }
        );
        const userValue = currentUserResult.items?.[0]?.value;
        const fullName = userValue?.name ?? userId;

        // Get room info
        const roomResult = await ditto.store.execute<Room>(
          `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
          { id: room._id }
        );

        if (roomResult.items.length === 0) {
          throw new Error("Room not found");
        }

        const actualRoom = roomResult.items[0].value;
        const messagesId = actualRoom.messagesId;

        // Generate unique document ID
        const docId =
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(16).slice(2) +
            Math.random().toString(16).slice(2);

        // Create file attachment
        console.log("Creating file attachment...");
        const fileData = new Uint8Array(await file.arrayBuffer());
        const fileAttachment = await ditto.store.newAttachment(
          fileData,
          createAttachmentMetadata(userId, fullName, "file", file)
        );

        // Now create the message document with file token
        const now = new Date();
        const nowIso = now.toISOString();
        const newDoc = {
          _id: docId,
          createdOn: nowIso,
          roomId: room._id,
          userId,
          text: text || file.name,
          fileAttachmentToken: fileAttachment,
          thumbnailImageToken: null,
          largeImageToken: null,
          isArchived: false,
          archivedMessage: null,
          isEdited: false,
          isDeleted: false,
        };

        // Insert the message with file attachment
        await ditto.store.execute(
          `INSERT INTO COLLECTION ${messagesId} (fileAttachmentToken ATTACHMENT) DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`,
          { newDoc }
        );

        console.log("File message created successfully");
      } catch (err) {
        console.error("Error in createFileMessage:", err);
        throw err;
      }
    },

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
            case "Progress":
              const downloaded = Number(event.downloadedBytes) || 0;
              const total = Number(event.totalBytes) || 1;
              const percent = downloaded / total;
              onProgress(percent);
              break;

            case "Completed":
              try {
                const dataResult = event.attachment.getData();
                const data =
                  dataResult instanceof Promise ? await dataResult : dataResult;

                const metadata = event.attachment.metadata || {};

                onComplete({
                  success: true,
                  data,
                  metadata,
                });
              } catch (error) {
                console.error("Error getting attachment data:", error);
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

            default:
              console.warn("Unknown attachment event type:", event);
              break;
          }
        });
      } catch (error) {
        console.error("Error fetching attachment:", error);
        onComplete({
          success: false,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to fetch attachment"),
        });
      }
    },
    async updateMessageReactions(
      message: Message,
      room: Room,
      reactions: Reaction[]
    ) {
      if (!ditto || !userId) return;

      const roomId = room._id;

      const messagesByRoom = _get().messagesByRoom;
      const roomMessages = messagesByRoom[roomId] || [];

      const index = roomMessages.findIndex((m) => m.id === message._id);
      if (index === -1) throw new Error("Message not found");

      const originalMessage = roomMessages[index].message;
      const previousReactions = originalMessage.reactions || [];

      // INSTANT OPTIMISTIC UPDATE (sync)
      _set((state: ChatStore) =>
        produce(state, (draft) => {
          draft.messagesByRoom[roomId][index].message.reactions = reactions;
        })
      );

      // DETACH DB update so it doesn't block UI
      setTimeout(async () => {
        try {
          const query = `UPDATE ${room.messagesId} SET reactions = :reactions WHERE _id = :id`;
          await ditto.store.execute(query, {
            id: originalMessage._id,
            reactions: reactions,
          });
        } catch (err) {
          console.error("Error updating reactions, rolling back:", err);

          // rollback optimistic state
          _set((state: ChatStore) =>
            produce(state, (draft) => {
              draft.messagesByRoom[roomId][index].message.reactions =
                previousReactions;
            })
          );
        }
      }, 0); // allow UI to paint immediately
    },
    async addReactionToMessage(
      message: Message,
      room: Room,
      reaction: Reaction
    ) {
      if (!ditto) return;
      if (!userId) return;

      try {
        const messagesByRoom = _get().messagesByRoom;
        const updateMessageReactions = _get().updateMessageReactions;
        const messageIndex = messagesByRoom[room._id].findIndex(
          (m) => m.id === message._id
        );
        if (messageIndex === -1) throw new Error("Message not found");

        const originalMessage = messagesByRoom[room._id][messageIndex].message;
        const reactions = [...(originalMessage.reactions || []), reaction];
        return updateMessageReactions(originalMessage, room, reactions);
      } catch (err) {
        console.error("Error in addReactionToMessage:", err);
        throw err;
      }
    },
    async removeReactionFromMessage(
      message: Message,
      room: Room,
      reaction: Reaction
    ) {
      if (!ditto) return;
      if (!userId) return;
      try {
        const messagesByRoom = _get().messagesByRoom;
        const updateMessageReactions = _get().updateMessageReactions;
        const messageIndex = messagesByRoom[room._id].findIndex(
          (m) => m.id === message._id
        );
        if (messageIndex === -1) throw new Error("Message not found");

        const originalMessage = messagesByRoom[room._id][messageIndex].message;
        const reactions = (originalMessage.reactions || []).filter(
          (r) => !(r.emoji === reaction.emoji && r.userId === reaction.userId)
        );
        return updateMessageReactions(originalMessage, room, reactions);
      } catch (err) {
        console.error("Error in removeReactionFromMessage:", err);
        throw err;
      }
    },
  };

  return store;
};

// Helper function to create thumbnail from image
async function createThumbnail(file: File): Promise<HTMLCanvasElement> {
  const maxSize = 282;
  const image = await fileToImage(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context");

  // Calculate thumbnail dimensions maintaining aspect ratio
  let { width, height } = image;
  if (width > height) {
    height = (maxSize / width) * height;
    width = maxSize;
  } else {
    width = (maxSize / height) * width;
    height = maxSize;
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
}

// Helper function to convert File to Image
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

// Helper function to convert Image or Canvas to Blob
async function imageToBlob(
  image: HTMLImageElement | HTMLCanvasElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (image instanceof HTMLCanvasElement) {
      image.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert canvas to blob"));
        },
        "image/jpeg",
        1.0
      );
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
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert image to blob"));
        },
        "image/jpeg",
        1.0
      );
    }
  });
}

// Helper function to create attachment metadata
function createAttachmentMetadata(
  userId: string,
  username: string,
  type: "thumbnail" | "large" | "file",
  file: File
): Record<string, string> {
  const timestamp = new Date().toISOString();
  const cleanName = username.replace(/\s/g, "-");
  const cleanTimestamp = timestamp.replace(/:/g, "-");
  const fileExtension =
    type === "file" ? file.name.split(".").pop() || "bin" : "jpg";
  const filename = `${cleanName}_${type}_${cleanTimestamp}.${fileExtension}`;

  return {
    filename: filename,
    userId: userId,
    username: username,
    fileformat: type === "file" ? `.${fileExtension}` : ".jpg",
    filesize: file.size.toString(),
    timestamp: timestamp,
    originalName: file.name,
  };
}
