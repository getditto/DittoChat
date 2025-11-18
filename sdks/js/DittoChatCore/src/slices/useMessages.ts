import {
  AttachmentToken,
  DQLQueryArgumentValue,
  StoreObserver,
  SyncSubscription,
} from "@dittolive/ditto";
import { produce, WritableDraft } from "immer";
import { v4 as uuidv4 } from "uuid";
import Message, { Reaction, Mention } from "../types/Message";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice, DittoConfParams } from "../useChat";
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

const CHAT_RETENTION_DAYS = 30;
const MESSAGE_RECENCY_THRESHOLD = 10000; // 10 seconds
const THUMBNAIL_MAX_SIZE = 282;

export const createMessageSlice: CreateSlice<MessageSlice> = (
  _set,
  _get,
  { ditto, userId, userCollectionKey }: DittoConfParams,
) => {
  // Helper: Get room details
  const getRoomDetails = async (room: Room) => {
    if (!ditto) throw new Error("Ditto not initialized");

    const result = await ditto.store.execute<Room>(
      `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
      { id: room._id },
    );

    if (result.items.length === 0) throw new Error("Room not found");
    return result.items[0].value;
  };

  // Helper: Get current user details
  const getCurrentUser = async () => {
    if (!ditto || !userId)
      throw new Error("Ditto not initialized or user not found");

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

    const mutableMessage = {
      ...messageWithUser,
      message: messageWithUser.message as unknown as WritableDraft<
        typeof messageWithUser.message
      >,
    };
    // Check for notifications on new messages
    const existingIndex = stateMessages!.findIndex((m) => m.id === message._id);

    if (
      existingIndex === -1 &&
      !message.archivedMessage &&
      shouldNotify(message, room)
    ) {
      _get().notificationHandler?.({ message, user, id: message._id }, room);
    }

    // Handle edited messages
    if (message.archivedMessage) {
      const originalIndex = stateMessages!.findIndex(
        (m) => m.id === message.archivedMessage,
      );

      if (originalIndex !== -1) {
        stateMessages[originalIndex] = mutableMessage;
      } else if (existingIndex === -1) {
        stateMessages!.push(mutableMessage);
      } else {
        stateMessages![existingIndex] = mutableMessage;
      }
    } else {
      // Handle new/updated messages
      if (existingIndex === -1) {
        stateMessages!.push(mutableMessage);
      } else {
        stateMessages![existingIndex] = mutableMessage;
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

    // return true;
    return !isOwnMessage && isRecent && (isSubscribed || isDM || isMentioned);
  };

  // Helper: Create a message document
  const createMessageDocument = async (
    room: Room,
    messageData: Partial<Message> & { text: string },
    collectionSpec: string = "",
  ) => {
    if (!ditto || !userId)
      throw new Error("Ditto not initialized or user not found");

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
      mentions: [],
      ...messageData,
    } as unknown as DQLQueryArgumentValue;

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
          if (!user) return;

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
    if (!ditto) throw new Error("Ditto not initialized");

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
    if (!ditto || !userId)
      throw new Error("Ditto not initialized or user not found");

    const user = await getCurrentUser();
    let attachments: Record<string, any> = {
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

    registerNotificationHandler(handler) {
      _set({ notificationHandler: handler });
    },

    async messagesPublisher(room: Room, retentionDays = CHAT_RETENTION_DAYS) {
      if (!ditto) return;

      const roomId = room._id;
      if (_get().messageSubscriptionsByRoom[roomId]) return;

      const retentionDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
      );
      const query = `SELECT * FROM COLLECTION ${room.messagesId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT, fileAttachmentToken ATTACHMENT)
        WHERE roomId = :roomId AND createdOn >= :date AND isArchived = false
        ORDER BY createdOn ASC`;

      const args = {
        roomId: room._id,
        date: retentionDate.toISOString(),
        dateMs: retentionDate.getTime(),
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
                if (result.items.length === 0) return draft;

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

    async createMessage(room: Room, text: string, mentions: Mention[] = []) {
      if (!ditto || !userId) return;

      try {
        const newDoc = await createMessageDocument(room, {
          text,
          mentions: mentions,
        });
      } catch (err) {
        console.error("Error in createMessage:", err);
      }
    },

    async saveEditedTextMessage(message: Message, room: Room) {
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
    },

    async saveDeletedMessage(
      message: Message,
      room: Room,
      type: "text" | "image" | "file" = "text",
    ) {
      const deletedText = {
        text: "[deleted message]",
        image: "[deleted image]",
        file: "[deleted file]",
      }[type];

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
    },

    async createImageMessage(room: Room, imageFile: File, text?: string) {
      await createAttachmentMessage(room, imageFile, text, "image");
    },

    async createFileMessage(room: Room, file: File, text?: string) {
      await createAttachmentMessage(room, file, text, "file");
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
              const progress =
                Number(event.downloadedBytes) / (Number(event.totalBytes) || 1);
              onProgress(progress);
              break;

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

    async updateMessageReactions(
      message: Message,
      room: Room,
      reactions: Reaction[],
    ) {
      if (!ditto || !userId) return;

      const roomId = room._id;
      const roomMessages = _get().messagesByRoom[roomId] || [];
      const index = roomMessages.findIndex((m) => m.id === message._id);

      if (index === -1) throw new Error("Message not found");

      const originalMessage = roomMessages[index].message;
      const previousReactions = originalMessage.reactions || [];

      // Optimistic update
      _set((state: ChatStore) =>
        produce(state, (draft) => {
          draft.messagesByRoom[roomId][index].message.reactions = reactions;
        }),
      );

      // Async DB update with rollback on error
      setTimeout(async () => {
        try {
          await ditto.store.execute(
            `UPDATE ${room.messagesId} SET reactions = :reactions WHERE _id = :id`,
            { id: originalMessage._id, reactions },
          );
        } catch (err) {
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

    async addReactionToMessage(
      message: Message,
      room: Room,
      reaction: Reaction,
    ) {
      if (!ditto || !userId) return;

      const roomMessages = _get().messagesByRoom[room._id];
      const messageIndex = roomMessages.findIndex((m) => m.id === message._id);
      if (messageIndex === -1) throw new Error("Message not found");

      const originalMessage = roomMessages[messageIndex].message;
      const reactions = [...(originalMessage.reactions || []), reaction];
      await _get().updateMessageReactions(originalMessage, room, reactions);
    },

    async removeReactionFromMessage(
      message: Message,
      room: Room,
      reaction: Reaction,
    ) {
      if (!ditto || !userId) return;

      const roomMessages = _get().messagesByRoom[room._id];
      const messageIndex = roomMessages.findIndex((m) => m.id === message._id);
      if (messageIndex === -1) throw new Error("Message not found");

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
  if (!ctx) throw new Error("Failed to get 2D context");

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
