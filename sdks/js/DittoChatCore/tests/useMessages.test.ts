import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createMockDitto, createTestStore } from "./setup";

describe("useMessages Slice", () => {
  let store: ReturnType<typeof createTestStore>;
  let mockDitto: any;

  const mockRoom = {
    _id: "room-1",
    name: "General",
    messagesId: "messages_room_1",
    collectionId: "rooms",
    createdBy: "admin",
    createdOn: "2023-01-01",
    isGenerated: false,
  };

  beforeEach(() => {
    mockDitto = createMockDitto();
    mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockRoom }] });
    store = createTestStore(mockDitto);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("createMessage inserts a new text message", async () => {
    await store.getState().createMessage(mockRoom, "Hello World");

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(
        `INSERT INTO ${mockRoom.messagesId} DOCUMENTS (:newDoc)`
      ),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          roomId: mockRoom._id,
          text: "Hello World",
          userId: "test-user-id",
          isDeleted: false,
          isEdited: false,
        }),
      })
    );
  });

  it("saveDeletedMessage archives original and creates deletion marker", async () => {
    const originalMsg = {
      _id: "msg-1",
      text: "Original",
      createdOn: "2023-01-01",
      roomId: "room-1",
      userId: "test-user-id",
      isArchived: false,
    };

    await store.getState().saveDeletedMessage(originalMsg as any, mockRoom);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE ${mockRoom.messagesId} SET isArchived`),
      { id: "msg-1", isArchived: true }
    );

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(`INSERT INTO ${mockRoom.messagesId}`),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          text: "[deleted message]",
          isDeleted: true,
          archivedMessage: "msg-1",
        }),
      })
    );
  });

  it("createImageMessage generates thumbnails and attachments", async () => {
    mockDitto.store.execute
      .mockResolvedValueOnce({ items: [{ value: mockRoom }] })
      .mockResolvedValueOnce({ items: [{ value: { name: "Bob" } }] });

    const mockFile = new File(["(⌐■_■)"], "cool-image.png", {
      type: "image/png",
    });

    // Start the async operation without awaiting it yet
    const promise = store
      .getState()
      .createImageMessage(mockRoom, mockFile, "Check this out");

    // Advance timers repeatedly to handle sequential async chains
    // (Thumbnail loads -> Promise resolves -> Large Image loads -> Promise resolves)
    for (let i = 0; i < 5; i++) {
      await vi.runAllTimersAsync(); 
    }

    await promise;

    expect(mockDitto.store.newAttachment).toHaveBeenCalledTimes(2);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO"),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          text: "Check this out",
          thumbnailImageToken: expect.any(Object),
          largeImageToken: expect.any(Object),
        }),
      })
    );
  });

  it("addReactionToMessage updates the message optimistically and in DB", async () => {
    const messageId = "msg-react-1";
    const initialMessage = {
      _id: messageId,
      text: "React to me",
      userId: "user-1",
      roomId: mockRoom._id,
      createdOn: new Date().toISOString(),
      isArchived: false,
      reactions: [],
    };

    store.setState((state) => ({
      messagesByRoom: {
        [mockRoom._id]: [
          {
            message: initialMessage as any,
            id: messageId,
            user: null,
          },
        ],
      },
    }));

    const reaction = { userId: "test-user-id", emoji: "👍" };

    await store
      .getState()
      .addReactionToMessage(initialMessage as any, mockRoom, reaction);

    // Run timers to trigger the optimistic rollback timeout
    await vi.runAllTimersAsync();

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE ${mockRoom.messagesId} SET reactions`),
      expect.objectContaining({
        id: messageId,
        reactions: [reaction],
      })
    );

    const updatedMsg = store.getState().messagesByRoom[mockRoom._id][0].message;
    expect(updatedMsg.reactions).toHaveLength(1);
    expect(updatedMsg.reactions?.[0].emoji).toBe("👍");
  });

  it("createFileMessage uploads attachment and inserts message", async () => {  

    mockDitto.store.execute.mockResolvedValueOnce({
      items: [{ value: { name: "Bob" } }],
    });

    const mockFile = new File(["content"], "doc.pdf", {
      type: "application/pdf",
    });

    await store
      .getState()
      .createFileMessage(mockRoom, mockFile, "Here is the PDF");

    expect(mockDitto.store.newAttachment).toHaveBeenCalledTimes(1);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO"),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          text: "Here is the PDF",
          fileAttachmentToken: expect.any(Object), 
          largeImageToken: null, 
        }),
      })
    );
  });

  it("saveEditedTextMessage archives old message and inserts new version", async () => {
    const originalMsg = {
      _id: "msg-edit-1",
      text: "Original Text",
      createdOn: "2023-01-01",
      roomId: "room-1",
      userId: "test-user-id",
      isArchived: false,
    };

    await store.getState().saveEditedTextMessage(originalMsg as any, mockRoom);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE ${mockRoom.messagesId} SET isArchived`),
      { id: "msg-edit-1", isArchived: true }
    );

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(`INSERT INTO ${mockRoom.messagesId}`),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          text: "Original Text", 
          isEdited: true,
          archivedMessage: "msg-edit-1",
        }),
      })
    );
  });

  it("removeReactionFromMessage removes specific reaction", async () => {
    const messageId = "msg-react-rem";
    const reactionToRemove = { userId: "test-user-id", emoji: "👍" };
    const reactionToKeep = { userId: "other-user", emoji: "❤️" };

    const initialMessage = {
      _id: messageId,
      text: "Reacted Msg",
      userId: "user-1",
      roomId: mockRoom._id,
      createdOn: new Date().toISOString(),
      isArchived: false,
      reactions: [reactionToRemove, reactionToKeep],
    };

    store.setState((state) => ({
      messagesByRoom: {
        [mockRoom._id]: [
          { message: initialMessage as any, id: messageId, user: null },
        ],
      },
    }));

    await store
      .getState()
      .removeReactionFromMessage(
        initialMessage as any,
        mockRoom,
        reactionToRemove
      );

    await vi.runAllTimersAsync();

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE ${mockRoom.messagesId} SET reactions`),
      expect.objectContaining({
        id: messageId,
        reactions: [reactionToKeep], 
      })
    );
  });

  it("fetchAttachment handles progress and completion", () => {
    const token = { id: "token-123", len: 100, metadata: {} };
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    mockDitto.store.fetchAttachment.mockImplementation((token, cb) => {
      cb({ type: "Progress", downloadedBytes: 50, totalBytes: 100 });
      cb({
        type: "Completed",
        attachment: { getData: () => new Uint8Array([1, 2, 3]), metadata: {} },
      });
    });

    store.getState().fetchAttachment(token as any, onProgress, onComplete);

    expect(onProgress).toHaveBeenCalledWith(0.5);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("messagesPublisher updates state on incoming messages", async () => {
    let observerCallback: any;
    mockDitto.store.registerObserver = vi.fn((query, cb) => {
      if (query.includes(`FROM COLLECTION ${mockRoom.messagesId}`)) {
        observerCallback = cb;
      }
      return { stop: vi.fn() };
    });

    await store.getState().messagesPublisher(mockRoom);

    expect(observerCallback).toBeDefined();

    const incomingMsg = {
      _id: "new-msg-1",
      text: "Incoming!",
      roomId: mockRoom._id,
      userId: "other-user",
      createdOn: new Date().toISOString(),
    };

    observerCallback({
      items: [{ value: incomingMsg }],
    });

    const messages = store.getState().messagesByRoom[mockRoom._id];
    expect(messages).toHaveLength(1);
    expect(messages[0].message.text).toBe("Incoming!");
  });
});
