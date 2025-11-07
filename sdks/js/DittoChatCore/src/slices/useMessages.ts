import { StoreObserver, SyncSubscription } from "@dittolive/ditto";
import { produce } from "immer";
import Message from "../types/Message";
import Room from "../types/Room";
import ChatUser from "../types/ChatUser";
import { ChatStore, CreateSlice, DittoConfParams } from "../useChat";
import MessageWithUser from "../types/MessageWithUser";

export interface MessageSlice {
  // Messages state organized by roomId
  messagesByRoom: Record<string, MessageWithUser[]>;
  messageObserversByRoom: Record<string, StoreObserver | null>;
  messageSubscriptionsByRoom: Record<string, SyncSubscription | null>;

  // Single message observer
  singleMessageObservers: Record<string, StoreObserver | null>;

  // Methods
  messagesPublisher: (room: Room, retentionDays?: number) => Promise<void>;
  messagePublisher: (messageId: string, collectionId: string) => Promise<void>;
  createMessage: (room: Room, text: string) => Promise<void>;
  saveEditedTextMessage: (message: Message, room: Room) => Promise<void>;
  saveDeletedImageMessage: (message: Message, room: Room) => Promise<void>;
  convertChat: (message: Message) => Promise<Message>;
  createImageMessage: (
    room: Room,
    imageFile: File,
    text?: string,
  ) => Promise<void>;
  fetchAttachment: (
    token: any,
    onProgress: (progress: number) => void,
    onComplete: (result: {
      success: boolean;
      data?: Uint8Array;
      metadata?: Record<string, string>;
      error?: Error;
    }) => void,
  ) => void;
}

interface ChatRetentionPolicy {
  days: number;
}

export const createMessageSlice: CreateSlice<MessageSlice> = (
  _set,
  _get,
  { ditto, userId, userCollectionKey }: DittoConfParams,
) => {
  const chatRetentionPolicy: ChatRetentionPolicy = { days: 30 };

  const store: MessageSlice = {
    messagesByRoom: {},
    messageObserversByRoom: {},
    messageSubscriptionsByRoom: {},
    singleMessageObservers: {},

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
        Date.now() - retentionDaysValue * 24 * 60 * 60 * 1000,
      );

      const query = `SELECT * FROM COLLECTION ${collectionId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT)
        WHERE roomId = :roomId
        AND (createdOn >= :date OR timeMs >= :dateMs OR b >= :dateMs)
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
        const observer = ditto.store.registerObserver(
          query,
          async (result) => {
            console.log("Message collection Modified");
            const messages: MessageWithUser[] = [];
            const messagesByRoom = (_get().messagesByRoom || {}) as Record<
              string,
              MessageWithUser[]
            >;
            const existingMessages = messagesByRoom[roomId] || [];
            for (const item of result.items) {
              const message = item.value as Message;
              const isExists = existingMessages.find(
                (m) => m.id === message._id,
              );
              if (!isExists) {
                const user = allUsers.find(
                  (u: ChatUser) => u._id === message.userId,
                );
                // TODO: Check convert chat implementation
                // TODO: Edit and Delete messages need to be handled
                // const converted = await _get().convertChat(message);
                _set((state: ChatStore) => {
                  return produce(state, (draft) => {
                    if (!draft.messagesByRoom[roomId]) {
                      draft.messagesByRoom[roomId] = [];
                    }
                    draft.messagesByRoom[roomId].push({
                      message,
                      user,
                      id: message._id,
                    });
                    return draft;
                  });

                  // return state;
                });
              }
            }
            // _set({
            //   messagesByRoom: {
            //     ..._get().messagesByRoom,
            //     [roomId]: messages,
            //   },
            // });
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

    async messagePublisher(messageId: string, collectionId: string) {
      if (!ditto) return;

      const key = `${collectionId}:${messageId}`;

      // If already observing, skip
      if (_get().singleMessageObservers[key]) {
        return;
      }

      const query = `SELECT * FROM COLLECTION ${collectionId} (thumbnailImageToken ATTACHMENT, largeImageToken ATTACHMENT) WHERE _id = :id`;
      const args = { id: messageId };

      try {
        const subscription = ditto.sync.registerSubscription(query, args);

        const observer = ditto.store.registerObserver(
          query,
          async (result) => {
            if (result.items.length > 0) {
              const message = result.items[0].value as Message;
              const converted = await _get().convertChat(message);

              const roomId = converted.roomId;
              const messagesByRoom = _get().messagesByRoom;

              if (messagesByRoom[roomId]) {
                const updated = messagesByRoom[roomId].map((msg: Message) =>
                  msg._id === messageId ? converted : msg,
                );

                if (!updated.find((m: Message) => m._id === messageId)) {
                  updated.push(converted);
                }

                _set({
                  messagesByRoom: {
                    ...messagesByRoom,
                    [roomId]: updated,
                  },
                });
              }
            }
          },
          args,
        );

        _set({
          singleMessageObservers: {
            ..._get().singleMessageObservers,
            [key]: observer,
          },
        });
      } catch (err) {
        console.error("Error in messagePublisher:", err);
      }
    },

    async convertChat(message: Message): Promise<Message> {
      if (!ditto) return message;

      if (message.hasBeenConverted === true) {
        return message;
      }

      const converted: Message = {
        ...message,
        hasBeenConverted: true,
        text: message.msg ?? message.text ?? "",
      };

      if (message.authorId && message.authorId.length > 0) {
        converted.userId = message.authorId;
      } else if (message.d && message.d.length > 0) {
        converted.userId = message.d;
      }

      if (message.timeMs) {
        converted.createdOn = message.timeMs;
      } else if (message.b) {
        converted.createdOn = new Date(message.b);
      }

      // Create the TAK user if it doesn't already exist
      if (message.authorId && message.authorId.length > 0) {
        const user: ChatUser = {
          _id: message.authorId,
          name: message.authorCs ?? message.authorId,
          subscriptions: {},
          mentions: {},
        };

        try {
          const userDoc = { ...user } as Record<string, any>;
          await ditto.store.execute(
            `INSERT INTO ${userCollectionKey} DOCUMENTS (:user) ON ID CONFLICT DO NOTHING`,
            { user: userDoc },
          );
        } catch (err) {
          console.error("Error creating TAK user:", err);
        }
      } else if (message.d && message.d.length > 0) {
        const user: ChatUser = {
          _id: message.d,
          name: message.e ?? message.d,
          subscriptions: {},
          mentions: {},
        };

        try {
          const userDoc = { ...user } as Record<string, any>;
          await ditto.store.execute(
            `INSERT INTO ${userCollectionKey} DOCUMENTS (:user) ON ID CONFLICT DO NOTHING`,
            { user: userDoc },
          );
        } catch (err) {
          console.error("Error creating TAK user:", err);
        }
      }

      // Update the message in the database with converted format
      try {
        const messageDoc = { ...converted } as Record<string, any>;
        await ditto.store.execute(
          `INSERT INTO ${message.roomId || "chat"} DOCUMENTS (:message) ON ID CONFLICT DO UPDATE`,
          { message: messageDoc },
        );
      } catch (err) {
        console.error("Error updating converted message:", err);
      }

      return converted;
    },

    async createMessage(room: Room, text: string) {
      if (!ditto) return;
      if (!userId) return;

      try {
        // Fetch current user to get name
        const currentUserResult = await ditto.store.execute(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId },
        );
        const userValue = currentUserResult.items?.[0]?.value;
        const fullName = userValue?.name ?? userId;

        const roomResult = await ditto.store.execute(
          `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
          { id: room._id },
        );

        if (roomResult.items.length === 0) {
          console.error("Room not found:", room._id);
          return;
        }

        const actualRoom = roomResult.items[0].value as Room;
        const messagesId = actualRoom.messagesId;

        const now = new Date();
        const nowIso = now.toISOString();
        const nowMs = Date.now();
        const authorId = userId;
        const authorCs = fullName ?? userId;
        const d = userId;
        const e = authorCs;
        const parent = "RootContactGroup";
        const authorType = "a-f-G-U-C";
        const authorLoc = "0.0,0.0,NaN,HAE,NaN,NaN";
        const roomName = (room as any).name ?? "";
        const takUid = (
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(16).slice(2) +
            Math.random().toString(16).slice(2)
        ).toUpperCase();

        const newDoc: Record<string, any> = {
          // Core fields
          roomId: room._id,
          text,
          userId,
          createdOn: nowIso,
          hasBeenConverted: true,
          isArchived: false,
          archivedMessage: null,
          largeImageToken: null,
          thumbnailImageToken: null,

          // TAK/legacy compatible fields
          msg: text,
          authorId,
          authorCs,
          authorLoc,
          authorType,
          parent,
          pks: "",
          room: roomName || "ditto",
          schver: 1,
          takUid,
          timeMs: nowMs,
          _r: false,
          _v: 2,
          a: "",
          b: nowMs,
          d,
          e,
        };

        const query = `INSERT INTO ${messagesId} DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`;
        await ditto.store.execute(query, { newDoc });
      } catch (err) {
        console.error("Error in createMessage:", err);
      }
    },

    async saveEditedTextMessage(message: Message, room: Room) {
      if (!ditto) return;

      try {
        const query = `UPDATE ${room.messagesId} SET text = :text WHERE _id = :id`;
        await ditto.store.execute(query, {
          id: message._id,
          text: message.text,
        });
      } catch (err) {
        console.error("Error in saveEditedTextMessage:", err);
      }
    },

    // WIP
    async saveDeletedImageMessage(message: Message, room: Room) {
      if (!ditto) return;

      try {
        const query = `UPDATE ${room.messagesId}
          SET thumbnailImageToken = null,
              largeImageToken = null,
              text = :text
          WHERE _id = :id`;

        await ditto.store.execute(query, {
          id: message._id,
          text: message.text,
        });
      } catch (err) {
        console.error("Error in saveDeletedImageMessage:", err);
      }
    },

    async createImageMessage(room: Room, imageFile: File, text?: string) {
      if (!ditto) throw new Error("Ditto not initialized");
      if (!userId) throw new Error("User ID not found");

      try {
        // Get current user info
        const currentUserResult = await ditto.store.execute(
          `SELECT * FROM ${userCollectionKey} WHERE _id = :id`,
          { id: userId },
        );
        const userValue = currentUserResult.items?.[0]?.value;
        const fullName = userValue?.name ?? userId;

        // Get room info
        const roomResult = await ditto.store.execute(
          `SELECT * FROM ${room.collectionId || "rooms"} WHERE _id = :id`,
          { id: room._id },
        );

        if (roomResult.items.length === 0) {
          throw new Error("Room not found");
        }

        const actualRoom = roomResult.items[0].value as Room;
        const messagesId = actualRoom.messagesId;

        // Generate unique document ID
        const docId =
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(16).slice(2) +
            Math.random().toString(16).slice(2);

        // Create thumbnail image
        const thumbnailImage = await createThumbnail(imageFile);
        const thumbnailBlob = await imageToBlob(thumbnailImage);
        const thumbnailData = new Uint8Array(await thumbnailBlob.arrayBuffer());

        // Create attachment for thumbnail
        const thumbnailAttachment = await ditto.store.newAttachment(
          thumbnailData,
          createAttachmentMetadata(userId, fullName, "thumbnail", imageFile),
        );

        // Create the initial message document with thumbnail
        const now = new Date();
        const nowIso = now.toISOString();

        const initialDoc: Record<string, any> = {
          _id: docId,
          createdOn: nowIso,
          roomId: room._id,
          userId,
          thumbnailImageToken: thumbnailAttachment,
        };

        // Insert the message with thumbnail
        await ditto.store.execute(
          `INSERT INTO COLLECTION ${messagesId} (thumbnailImageToken ATTACHMENT) DOCUMENTS (:newDoc) ON ID CONFLICT DO UPDATE`,
          { newDoc: initialDoc },
        );

        // Now create the large image attachment
        const largeImageBlob = await imageToBlob(await fileToImage(imageFile));
        const largeImageData = new Uint8Array(
          await largeImageBlob.arrayBuffer(),
        );

        const largeAttachment = await ditto.store.newAttachment(
          largeImageData,
          createAttachmentMetadata(userId, fullName, "large", imageFile),
        );

        // Update the message with the large image
        await ditto.store.execute(
          `UPDATE COLLECTION ${messagesId} (largeImageToken ATTACHMENT) SET largeImageToken = :largeAttachment WHERE _id = :id`,
          {
            id: docId,
            largeAttachment: largeAttachment,
          },
        );
      } catch (err) {
        console.error("Error in createImageMessage:", err);
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
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to convert Image or Canvas to Blob
async function imageToBlob(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (image instanceof HTMLCanvasElement) {
      image.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert canvas to blob"));
        },
        "image/jpeg",
        1.0,
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
        1.0,
      );
    }
  });
}

// Helper function to create attachment metadata
function createAttachmentMetadata(
  userId: string,
  username: string,
  type: "thumbnail" | "large",
  file: File,
): Record<string, string> {
  const timestamp = new Date().toISOString();
  const cleanName = username.replace(/\s/g, "-");
  const cleanTimestamp = timestamp.replace(/:/g, "-");
  const filename = `${cleanName}_${type}_${cleanTimestamp}.jpg`;

  return {
    filename: filename,
    userId: userId,
    username: username,
    fileformat: ".jpg",
    filesize: file.size.toString(),
    timestamp: timestamp,
  };
}
