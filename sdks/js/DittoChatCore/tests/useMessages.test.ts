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

  describe("createMessage", () => {
    it("inserts a new text message", async () => {
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

    it("creates message with mentions and updates user mentions", async () => {
      const mentions = [
        { userId: "user-1", displayName: "User 1", startIndex: 6, endIndex: 12 },
        { userId: "user-2", displayName: "User 2", startIndex: 13, endIndex: 19 },
      ];

      store.setState({
        allUsers: [
          { _id: "user-1", name: "User 1", subscriptions: {}, mentions: {} },
          { _id: "user-2", name: "User 2", subscriptions: {}, mentions: {} },
        ],
      });

      await store.getState().createMessage(mockRoom, "Hello @User1 @User2", mentions);

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET mentions"),
        expect.objectContaining({
          id: expect.any(String),
          mentions: expect.any(Object),
        })
      );
    });

    it("skips mention update for non-existent users", async () => {
      const mentions = [{ userId: "nonexistent-user", displayName: "Ghost", startIndex: 6, endIndex: 12 }];

      store.setState({ allUsers: [] });

      await store.getState().createMessage(mockRoom, "Hello @Ghost", mentions);

      // Should not throw and should create message
      expect(mockDitto.store.execute).toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.store.execute.mockRejectedValueOnce(new Error("DB Error"));

      await store.getState().createMessage(mockRoom, "Test message");

      expect(consoleSpy).toHaveBeenCalledWith("Error in createMessage:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("returns early when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);

      await storeWithoutDitto.getState().createMessage(mockRoom, "Test");

      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });
  });

  describe("saveDeletedMessage", () => {
    it("archives original and creates deletion marker for text", async () => {
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

    it("handles image deletion", async () => {
      const message = {
        _id: "img-msg",
        text: "Image",
        createdOn: "2023-01-01",
        roomId: mockRoom._id,
        userId: "test-user-id",
        isArchived: false,
      };

      await store.getState().saveDeletedMessage(message as any, mockRoom, "image");

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.objectContaining({
          newDoc: expect.objectContaining({
            text: "[deleted image]",
            isDeleted: true,
          }),
        })
      );
    });

    it("handles file deletion", async () => {
      const message = {
        _id: "file-msg",
        text: "File",
        createdOn: "2023-01-01",
        roomId: mockRoom._id,
        userId: "test-user-id",
        isArchived: false,
      };

      await store.getState().saveDeletedMessage(message as any, mockRoom, "file");

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.objectContaining({
          newDoc: expect.objectContaining({
            text: "[deleted file]",
            isDeleted: true,
          }),
        })
      );
    });
  });

  describe("saveEditedTextMessage", () => {
    it("archives old message and inserts new version", async () => {
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
  });

  describe("createImageMessage", () => {
    it("generates thumbnails and attachments", async () => {
      mockDitto.store.execute
        .mockResolvedValueOnce({ items: [{ value: mockRoom }] })
        .mockResolvedValueOnce({ items: [{ value: { name: "Bob" } }] });

      const mockFile = new File(["(⌐■_■)"], "cool-image.png", {
        type: "image/png",
      });

      const promise = store
        .getState()
        .createImageMessage(mockRoom, mockFile, "Check this out");

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
  });

  describe("createFileMessage", () => {
    it("uploads attachment and inserts message", async () => {
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
  });

  describe("Message reactions", () => {
    describe("addReactionToMessage", () => {
      it("updates the message optimistically and in DB", async () => {
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

      it("throws when message not found", async () => {
        const message = { _id: "nonexistent", text: "Test" } as any;
        const reaction = { userId: "user-1", emoji: "👍" };

        store.setState({ messagesByRoom: { [mockRoom._id]: [] } });

        await expect(
          store.getState().addReactionToMessage(message, mockRoom, reaction)
        ).rejects.toThrow("Message not found");
      });

      it("returns early when ditto is null", async () => {
        const storeWithoutDitto = createTestStore(null);
        const message = { _id: "msg-1", text: "Test" } as any;
        const reaction = { userId: "user-1", emoji: "👍" };

        await storeWithoutDitto.getState().addReactionToMessage(message, mockRoom, reaction);

        expect(mockDitto.store.execute).not.toHaveBeenCalled();
      });
    });

    describe("removeReactionFromMessage", () => {
      it("removes specific reaction", async () => {
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

      it("throws when message not found", async () => {
        const message = { _id: "nonexistent", text: "Test" } as any;
        const reaction = { userId: "user-1", emoji: "👍" };

        store.setState({ messagesByRoom: { [mockRoom._id]: [] } });

        await expect(
          store.getState().removeReactionFromMessage(message, mockRoom, reaction)
        ).rejects.toThrow("Message not found");
      });

      it("returns early when ditto is null", async () => {
        const storeWithoutDitto = createTestStore(null);
        const message = { _id: "msg-1", text: "Test" } as any;
        const reaction = { userId: "user-1", emoji: "👍" };

        await storeWithoutDitto.getState().removeReactionFromMessage(message, mockRoom, reaction);

        expect(mockDitto.store.execute).not.toHaveBeenCalled();
      });
    });

    describe("updateMessageReactions", () => {
      it("handles errors and rolls back", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

        const message = {
          _id: "msg-1",
          text: "Test",
          userId: "user-1",
          roomId: mockRoom._id,
          createdOn: new Date().toISOString(),
          isArchived: false,
          reactions: [],
        };

        store.setState({
          messagesByRoom: {
            [mockRoom._id]: [{ message: message as any, id: message._id, user: null }],
          },
        });

        mockDitto.store.execute.mockRejectedValueOnce(new Error("Update Error"));

        const newReactions = [{ userId: "test-user-id", emoji: "👍" }];
        await store.getState().updateMessageReactions(message as any, mockRoom, newReactions);

        await vi.runAllTimersAsync();

        expect(consoleSpy).toHaveBeenCalledWith(
          "Error updating reactions, rolling back:",
          expect.any(Error)
        );

        // Verify rollback happened
        const finalMessage = store.getState().messagesByRoom[mockRoom._id][0].message;
        expect(finalMessage.reactions).toEqual([]);

        consoleSpy.mockRestore();
      });

      it("throws when message not found", async () => {
        const message = { _id: "nonexistent", text: "Test" } as any;

        store.setState({ messagesByRoom: { [mockRoom._id]: [] } });

        await expect(
          store.getState().updateMessageReactions(message, mockRoom, [])
        ).rejects.toThrow("Message not found");
      });

      it("returns early when ditto is null", async () => {
        const storeWithoutDitto = createTestStore(null);
        const message = { _id: "msg-1", text: "Test" } as any;

        await storeWithoutDitto.getState().updateMessageReactions(message, mockRoom, []);

        expect(mockDitto.store.execute).not.toHaveBeenCalled();
      });
    });
  });

  describe("fetchAttachment", () => {
    it("handles progress and completion", () => {
      const token = { id: "token-123", len: 100, metadata: {} };
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      mockDitto.store.fetchAttachment.mockImplementation((token: any, cb: any) => {
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

    it("returns error when ditto is null", () => {
      const storeWithoutDitto = createTestStore(null);
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const token = { id: "token-123", len: 100, metadata: {} };

      storeWithoutDitto.getState().fetchAttachment(token as any, onProgress, onComplete);

      expect(onComplete).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
      });
      expect(onComplete.mock.calls[0][0].error.message).toBe("Ditto not initialized");
    });

    it("returns error when token is null", () => {
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      store.getState().fetchAttachment(null as any, onProgress, onComplete);

      expect(onComplete).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
      });
      expect(onComplete.mock.calls[0][0].error.message).toBe("No attachment token provided");
    });

    it("handles Deleted event", () => {
      const token = { id: "token-123", len: 100, metadata: {} };
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      mockDitto.store.fetchAttachment.mockImplementation((token: any, cb: any) => {
        cb({ type: "Deleted" });
      });

      store.getState().fetchAttachment(token as any, onProgress, onComplete);

      expect(onComplete).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
      });
      expect(onComplete.mock.calls[0][0].error.message).toBe("Attachment was deleted");
    });

    it("handles error in getData", () => {
      const token = { id: "token-123", len: 100, metadata: {} };
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      mockDitto.store.fetchAttachment.mockImplementation((token: any, cb: any) => {
        cb({
          type: "Completed",
          attachment: {
            getData: () => {
              throw new Error("getData failed");
            },
            metadata: {},
          },
        });
      });

      store.getState().fetchAttachment(token as any, onProgress, onComplete);

      expect(onComplete).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
      });
    });

    it("handles fetchAttachment throwing error", () => {
      const token = { id: "token-123", len: 100, metadata: {} };
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      mockDitto.store.fetchAttachment.mockImplementation(() => {
        throw new Error("Fetch failed");
      });

      store.getState().fetchAttachment(token as any, onProgress, onComplete);

      expect(onComplete).toHaveBeenCalledWith({
        success: false,
        error: expect.any(Error),
      });
    });

    it("handles async getData", async () => {
      const token = { id: "token-123", len: 100, metadata: {} };
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      mockDitto.store.fetchAttachment.mockImplementation((token: any, cb: any) => {
        cb({
          type: "Completed",
          attachment: {
            getData: () => Promise.resolve(new Uint8Array([1, 2, 3])),
            metadata: { test: "metadata" },
          },
        });
      });

      store.getState().fetchAttachment(token as any, onProgress, onComplete);

      // Wait for async getData to complete
      await vi.runAllTimersAsync();

      expect(onComplete).toHaveBeenCalledWith({
        success: true,
        data: expect.any(Uint8Array),
        metadata: { test: "metadata" },
      });
    });
  });

  describe("messagesPublisher", () => {
    it("updates state on incoming messages", async () => {
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

    it("uses custom retention days", async () => {
      await store.getState().messagesPublisher(mockRoom, 7);

      expect(mockDitto.sync.registerSubscription).toHaveBeenCalledWith(
        expect.stringContaining("WHERE roomId = :roomId AND createdOn >= :date"),
        expect.objectContaining({
          roomId: mockRoom._id,
          date: expect.any(String),
        })
      );
    });

    it("uses room retention days", async () => {
      const roomWithRetention = { ...mockRoom, retentionDays: 14 };
      mockDitto.store.execute.mockResolvedValueOnce({ items: [{ value: roomWithRetention }] });

      await store.getState().messagesPublisher(roomWithRetention);
      expect(mockDitto.sync.registerSubscription).toHaveBeenCalled();
    });

    it("does not create duplicate subscription", async () => {
      mockDitto.sync.registerSubscription.mockClear();

      await store.getState().messagesPublisher(mockRoom);
      const firstCallCount = mockDitto.sync.registerSubscription.mock.calls.length;

      await store.getState().messagesPublisher(mockRoom);
      const secondCallCount = mockDitto.sync.registerSubscription.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });

    it("handles errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.sync.registerSubscription.mockImplementation(() => {
        throw new Error("Subscription Error");
      });

      await store.getState().messagesPublisher(mockRoom);

      expect(consoleSpy).toHaveBeenCalledWith("Error in messagesPublisher:", expect.any(Error));
      consoleSpy.mockRestore();
    });

    it("returns early when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);
      const mockDittoForTest = createMockDitto();

      mockDittoForTest.sync.registerSubscription.mockClear();

      await storeWithoutDitto.getState().messagesPublisher(mockRoom);

      expect(mockDittoForTest.sync.registerSubscription).not.toHaveBeenCalled();
    });
  });

  describe("Notification handler", () => {
    it("registers notification handler", () => {
      const handler = vi.fn();

      store.getState().registerNotificationHandler(handler);

      expect(store.getState().notificationHandler).toBe(handler);
    });

    it("notification handler is called for new messages", async () => {
      const handler = vi.fn();
      store.getState().registerNotificationHandler(handler);

      store.setState({
        currentUser: {
          _id: "other-user",
          name: "Other User",
          subscriptions: { [mockRoom._id]: new Date().toISOString() },
          mentions: {},
        },
      });

      let observerCallback: any;
      mockDitto.store.registerObserver = vi.fn((query, cb) => {
        observerCallback = cb;
        return { stop: vi.fn() };
      });

      await store.getState().messagesPublisher(mockRoom);

      const newMessage = {
        _id: "new-msg",
        text: "New message",
        roomId: mockRoom._id,
        userId: "test-user-id",
        createdOn: new Date().toISOString(),
        isArchived: false,
      };

      observerCallback({ items: [{ value: newMessage }] });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("Message update logic (handleMessageUpdate)", () => {
    let observerCallback: any;

    beforeEach(async () => {
      mockDitto.store.registerObserver = vi.fn((query, cb) => {
        if (query.includes(`FROM COLLECTION ${mockRoom.messagesId}`)) {
          observerCallback = cb;
        }
        return { stop: vi.fn() };
      });

      await store.getState().messagesPublisher(mockRoom);
    });

    describe("Archived messages (edited/deleted)", () => {
      it("replaces original message when archivedMessage points to existing message", async () => {
        // First, add an original message
        const originalMessage = {
          _id: "original-msg-1",
          text: "Original text",
          roomId: mockRoom._id,
          userId: "test-user-id",
          createdOn: "2023-01-01T00:00:00Z",
          isArchived: false,
        };

        observerCallback({ items: [{ value: originalMessage }] });

        // Verify original message is in state
        let messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message._id).toBe("original-msg-1");

        // Now send an edited version that archives the original
        const editedMessage = {
          _id: "edited-msg-1",
          text: "Edited text",
          roomId: mockRoom._id,
          userId: "test-user-id",
          createdOn: "2023-01-01T00:00:00Z",
          isArchived: false,
          isEdited: true,
          archivedMessage: "original-msg-1", // Points to original
        };

        observerCallback({ items: [{ value: editedMessage }] });

        // Verify: should replace at original index (originalIndex !== -1)
        messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message._id).toBe("edited-msg-1");
        expect(messages[0].message.text).toBe("Edited text");
        expect(messages[0].message.isEdited).toBe(true);
      });

      it("pushes archived message when original not found and message doesn't exist", async () => {
        // Send an edited message that references a non-existent original
        const editedMessage = {
          _id: "edited-msg-2",
          text: "Edited text",
          roomId: mockRoom._id,
          userId: "test-user-id",
          createdOn: "2023-01-02T00:00:00Z",
          isArchived: false,
          isEdited: true,
          archivedMessage: "nonexistent-original", // Original not in state
        };

        observerCallback({ items: [{ value: editedMessage }] });

        // Verify: should push (originalIndex === -1 && existingIndex === -1)
        const messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message._id).toBe("edited-msg-2");
        expect(messages[0].message.text).toBe("Edited text");
      });

      it("updates existing archived message when it already exists", async () => {
        // First, add an archived message
        const archivedMessage = {
          _id: "archived-msg-3",
          text: "Deleted message",
          roomId: mockRoom._id,
          userId: "test-user-id",
          createdOn: "2023-01-03T00:00:00Z",
          isArchived: false,
          isDeleted: true,
          archivedMessage: "some-original",
        };

        observerCallback({ items: [{ value: archivedMessage }] });

        // Verify it's in state
        let messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message.text).toBe("Deleted message");

        // Now update the same archived message (e.g., reaction added)
        const updatedArchivedMessage = {
          ...archivedMessage,
          reactions: [{ userId: "user-1", emoji: "👍" }],
        };

        observerCallback({ items: [{ value: updatedArchivedMessage }] });

        // Verify: should update at existing index (originalIndex === -1 && existingIndex !== -1)
        messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message._id).toBe("archived-msg-3");
        expect(messages[0].message.reactions).toHaveLength(1);
      });
    });

    describe("Regular messages (new/updated)", () => {
      it("pushes new message when it doesn't exist", async () => {
        const newMessage = {
          _id: "new-msg-1",
          text: "Brand new message",
          roomId: mockRoom._id,
          userId: "test-user-id",
          createdOn: new Date().toISOString(),
          isArchived: false,
        };

        observerCallback({ items: [{ value: newMessage }] });

        // Verify: should push (existingIndex === -1)
        const messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message._id).toBe("new-msg-1");
        expect(messages[0].message.text).toBe("Brand new message");
      });

      it("updates existing message when it already exists", async () => {
        // First, add a message
        const originalMessage = {
          _id: "msg-to-update",
          text: "Original text",
          roomId: mockRoom._id,
          userId: "test-user-id",
          createdOn: "2023-01-04T00:00:00Z",
          isArchived: false,
          reactions: [],
        };

        observerCallback({ items: [{ value: originalMessage }] });

        // Verify it's in state
        let messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message.reactions).toHaveLength(0);

        // Now update it (e.g., add reactions)
        const updatedMessage = {
          ...originalMessage,
          reactions: [{ userId: "user-1", emoji: "❤️" }],
        };

        observerCallback({ items: [{ value: updatedMessage }] });

        // Verify: should update at existing index (existingIndex !== -1)
        messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(1);
        expect(messages[0].message._id).toBe("msg-to-update");
        expect(messages[0].message.reactions).toHaveLength(1);
        expect(messages[0].message.reactions![0].emoji).toBe("❤️");
      });

      it("handles multiple messages in single observer callback", async () => {
        const messages = [
          {
            _id: "msg-1",
            text: "Message 1",
            roomId: mockRoom._id,
            userId: "user-1",
            createdOn: "2023-01-05T00:00:00Z",
            isArchived: false,
          },
          {
            _id: "msg-2",
            text: "Message 2",
            roomId: mockRoom._id,
            userId: "user-2",
            createdOn: "2023-01-05T00:01:00Z",
            isArchived: false,
          },
          {
            _id: "msg-3",
            text: "Message 3",
            roomId: mockRoom._id,
            userId: "user-3",
            createdOn: "2023-01-05T00:02:00Z",
            isArchived: false,
          },
        ];

        observerCallback({ items: messages.map(value => ({ value })) });

        const stateMessages = store.getState().messagesByRoom[mockRoom._id];
        expect(stateMessages).toHaveLength(3);
        expect(stateMessages[0].message._id).toBe("msg-1");
        expect(stateMessages[1].message._id).toBe("msg-2");
        expect(stateMessages[2].message._id).toBe("msg-3");
      });

      it("handles empty result items", async () => {
        observerCallback({ items: [] });

        const messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toEqual([]);
      });
    });

    describe("Complex scenarios", () => {
      it("handles mix of new, updated, and archived messages", async () => {
        // Step 1: Add original messages
        const originalMessages = [
          {
            _id: "msg-a",
            text: "Message A",
            roomId: mockRoom._id,
            userId: "user-1",
            createdOn: "2023-01-06T00:00:00Z",
            isArchived: false,
          },
          {
            _id: "msg-b",
            text: "Message B",
            roomId: mockRoom._id,
            userId: "user-2",
            createdOn: "2023-01-06T00:01:00Z",
            isArchived: false,
          },
        ];

        observerCallback({ items: originalMessages.map(value => ({ value })) });

        let messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(2);

        // Step 2: Send mixed update
        const mixedUpdate = [
          // Update existing message A
          {
            _id: "msg-a",
            text: "Message A updated",
            roomId: mockRoom._id,
            userId: "user-1",
            createdOn: "2023-01-06T00:00:00Z",
            isArchived: false,
          },
          // New message C
          {
            _id: "msg-c",
            text: "Message C",
            roomId: mockRoom._id,
            userId: "user-3",
            createdOn: "2023-01-06T00:02:00Z",
            isArchived: false,
          },
          // Edited version of message B
          {
            _id: "msg-b-edited",
            text: "Message B edited",
            roomId: mockRoom._id,
            userId: "user-2",
            createdOn: "2023-01-06T00:01:00Z",
            isArchived: false,
            isEdited: true,
            archivedMessage: "msg-b",
          },
        ];

        observerCallback({ items: mixedUpdate.map(value => ({ value })) });

        messages = store.getState().messagesByRoom[mockRoom._id];
        expect(messages).toHaveLength(3);

        // Verify msg-a was updated
        const msgA = messages.find(m => m.message._id === "msg-a");
        expect(msgA?.message.text).toBe("Message A updated");

        // Verify msg-b was replaced with edited version
        const msgB = messages.find(m => m.message._id === "msg-b-edited");
        expect(msgB?.message.text).toBe("Message B edited");
        expect(msgB?.message.isEdited).toBe(true);

        // Verify msg-c was added
        const msgC = messages.find(m => m.message._id === "msg-c");
        expect(msgC?.message.text).toBe("Message C");
      });
    });
  });
});
