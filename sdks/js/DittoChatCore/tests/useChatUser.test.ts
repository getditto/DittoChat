import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockDitto, createTestStore, MockDitto } from "./setup";
import ChatUser from "../src/types/ChatUser";

describe("useChatUser Slice", () => {
  let store: ReturnType<typeof createTestStore>;
  let mockDitto: MockDitto;

  beforeEach(() => {
    mockDitto = createMockDitto();
    store = createTestStore(mockDitto);
  });

  describe("addUser", () => {
    it("executes correct INSERT query", async () => {
      const newUser = { name: "New User", subscriptions: {}, mentions: {} };
      await store.getState().addUser(newUser);

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users DOCUMENTS (:newUser)"),
        expect.objectContaining({ newUser })
      );
    });

    it("handles errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.store.execute.mockRejectedValueOnce(new Error("DB Error"));

      const newUser = { name: "Test User", subscriptions: {}, mentions: {} };
      await store.getState().addUser(newUser);

      expect(consoleSpy).toHaveBeenCalledWith("Error in addUser:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("findUserById", () => {
    it("executes correct SELECT query", async () => {
      const mockUser = { _id: "user-123", name: "Found Me" };
      mockDitto.store.execute.mockResolvedValueOnce({ items: [{ value: mockUser }] });

      const result = await store.getState().findUserById("user-123");

      expect(result).toEqual(mockUser);
      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM users WHERE _id = :id"),
        { id: "user-123" }
      );
    });

    it("returns null when user not found", async () => {
      mockDitto.store.execute.mockResolvedValueOnce({ items: [] });

      const result = await store.getState().findUserById("nonexistent");

      expect(result).toBeUndefined();
    });

    it("handles errors and returns null", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.store.execute.mockRejectedValueOnce(new Error("DB Error"));

      const result = await store.getState().findUserById("user-123");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith("Error in findUserById:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("updateUser", () => {
    it("fetches current user, merges data, and updates DB", async () => {
      const currentUser = { _id: "user-update", name: "Old Name", subscriptions: {} };

      mockDitto.store.execute.mockResolvedValueOnce({ items: [{ value: currentUser }] });

      await store.getState().updateUser({ _id: "user-update", name: "New Name" });

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            _id: "user-update",
            name: "New Name",
            subscriptions: {}
          })
        })
      );
    });

    it("returns early when user not found", async () => {
      mockDitto.store.execute.mockResolvedValueOnce({ items: [] });

      await store.getState().updateUser({ _id: "nonexistent", name: "New Name" });

      // Should only call execute once (for findUserById), not for update
      expect(mockDitto.store.execute).toHaveBeenCalledTimes(1);
    });

    it("handles errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.store.execute.mockRejectedValueOnce(new Error("DB Error"));

      await store.getState().updateUser({ _id: "user-123", name: "New Name" });

      // Error occurs in findUserById which is called internally
      expect(consoleSpy).toHaveBeenCalledWith("Error in findUserById:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });


  describe("markRoomAsRead", () => {
    it("updates timestamps and clears mentions", async () => {
      const roomId = "room-active";

      const mockUser = {
        _id: "test-user-id",
        subscriptions: { [roomId]: "2023-01-01" },
        mentions: { [roomId]: ["msg-1", "msg-2"] },
      };

      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().markRoomAsRead(roomId);

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            subscriptions: expect.objectContaining({
              [roomId]: expect.not.stringMatching("2023-01-01"),
            }),
            mentions: expect.objectContaining({
              [roomId]: [],
            }),
          }),
        })
      );
    });

    it("handles user with no subscriptions object", async () => {
      const mockUser = {
        _id: "test-user-id",
        mentions: { "room-123": ["msg-1"] },
      };

      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().markRoomAsRead("room-123");

      // Should still clear mentions even without subscriptions
      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            mentions: expect.objectContaining({
              "room-123": [],
            }),
          }),
        })
      );
    });

    it("handles user with no mentions object", async () => {
      const mockUser = {
        _id: "test-user-id",
        subscriptions: { "room-123": "2023-01-01" },
      };

      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().markRoomAsRead("room-123");

      // Should still update subscription even without mentions
      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            subscriptions: expect.objectContaining({
              "room-123": expect.any(String),
            }),
          }),
        })
      );
    });

    it("does not update if room is not subscribed and has no mentions", async () => {
      const mockUser = {
        _id: "test-user-id",
        subscriptions: { "other-room": "2023-01-01" },
        mentions: {},
      };

      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().markRoomAsRead("room-123");

      // Should only call execute once (for findUserById), not for update
      expect(mockDitto.store.execute).toHaveBeenCalledTimes(1);
    });

    it("returns early when user not found", async () => {
      mockDitto.store.execute.mockResolvedValue({ items: [] });

      await store.getState().markRoomAsRead("room-123");

      // Should only call execute once (for findUserById)
      expect(mockDitto.store.execute).toHaveBeenCalledTimes(1);
    });

    it("handles errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.store.execute.mockRejectedValueOnce(new Error("DB Error"));

      await store.getState().markRoomAsRead("room-123");

      // Error occurs in findUserById which is called internally
      expect(consoleSpy).toHaveBeenCalledWith("Error in findUserById:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("toggleRoomSubscription", () => {
    it("subscribes when not already subscribed", async () => {
      const roomId = "room-123";
      const mockUser = {
        _id: "test-user-id",
        subscriptions: { "other-room": "2023-01-01" },
      };

      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().toggleRoomSubscription(roomId);

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            subscriptions: expect.objectContaining({
              [roomId]: expect.any(String),
              "other-room": "2023-01-01",
            }),
          }),
        })
      );
    });

    it("unsubscribes when already subscribed", async () => {
      const roomId = "room-to-leave";

      const mockUser = {
        _id: "test-user-id",
        subscriptions: { [roomId]: "2023-01-01", "other-room": "2023-01-01" },
      };
      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().toggleRoomSubscription(roomId);

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            subscriptions: { "room-to-leave": null, "other-room": "2023-01-01" },
          }),
        })
      );
    });

    it("subscribes when user has no subscriptions object", async () => {
      const mockUser = { _id: "test-user-id" };
      mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

      await store.getState().toggleRoomSubscription("room-123");

      expect(mockDitto.store.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.objectContaining({
          newUser: expect.objectContaining({
            subscriptions: expect.objectContaining({
              "room-123": expect.any(String),
            }),
          }),
        })
      );
    });

    it("returns early when user not found", async () => {
      mockDitto.store.execute.mockResolvedValue({ items: [] });

      await store.getState().toggleRoomSubscription("room-123");

      // Should only call execute once (for findUserById)
      expect(mockDitto.store.execute).toHaveBeenCalledTimes(1);
    });

    it("handles errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      mockDitto.store.execute.mockRejectedValueOnce(new Error("DB Error"));

      await store.getState().toggleRoomSubscription("room-123");

      // Error occurs in findUserById which is called internally
      expect(consoleSpy).toHaveBeenCalledWith("Error in findUserById:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("Observer callbacks", () => {
    it("sets up user observer and subscription", () => {
      expect(mockDitto.sync.registerSubscription).toHaveBeenCalled();
      expect(mockDitto.store.registerObserver).toHaveBeenCalled();
    });

    it("sets up allUsers observer and subscription", () => {
      // Check that registerSubscription was called with the allUsers query
      const subscriptionCalls = mockDitto.sync.registerSubscription.mock.calls;
      const allUsersCall = subscriptionCalls.find((call: unknown[]) =>
        (call[0] as string).includes("SELECT * FROM users") && call.length === 1
      );
      expect(allUsersCall).toBeDefined();

      // Check that registerObserver was called with the allUsers query
      const observerCalls = mockDitto.store.registerObserver.mock.calls;
      const allUsersObserverCall = observerCalls.find((call: unknown[]) =>
        (call[0] as string).includes("SELECT * FROM users") && !(call[0] as string).includes("WHERE")
      );
      expect(allUsersObserverCall).toBeDefined();
    });

    it("user observer callback updates currentUser state", () => {
      // Get the observer callback that was registered
      const observerCalls = mockDitto.store.registerObserver.mock.calls;
      const userObserverCall = observerCalls.find((call: unknown[]) =>
        (call[0] as string).includes("SELECT * FROM users WHERE _id")
      );

      expect(userObserverCall).toBeDefined();
      const callback = userObserverCall![1];

      // Call the callback with mock data
      const mockUser = { _id: "test-user-id", name: "Test User" };
      callback({ items: [{ value: mockUser }] });

      // Verify the state was updated
      expect(store.getState().currentUser).toEqual(mockUser);
    });

    it("allUsers observer callback updates allUsers state", () => {
      // Get the observer callback that was registered
      const observerCalls = mockDitto.store.registerObserver.mock.calls;
      const allUsersObserverCall = observerCalls.find((call: unknown[]) =>
        (call[0] as string).includes("SELECT * FROM users") && !(call[0] as string).includes("WHERE")
      );

      expect(allUsersObserverCall).toBeDefined();
      const callback = allUsersObserverCall![1];

      // Call the callback with mock data
      const mockUsers = [
        { _id: "user-1", name: "User 1" },
        { _id: "user-2", name: "User 2" },
      ];
      callback({ items: mockUsers.map(value => ({ value })) });

      // Verify the state was updated
      expect(store.getState().allUsers).toEqual(mockUsers);
      expect(store.getState().usersLoading).toBe(false);
    });
  });

  describe("Edge cases with null ditto", () => {
    it("addUser returns early when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);

      await storeWithoutDitto.getState().addUser({
        name: "Test",
        subscriptions: {},
        mentions: {}
      });

      // Should not throw and should not call execute
      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });

    it("updateUser returns early when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);

      await storeWithoutDitto.getState().updateUser({
        _id: "user-123",
        name: "Test"
      });

      // Should not throw and should not call execute
      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });

    it("updateUser returns early when _id is missing", async () => {
      await store.getState().updateUser({ name: "Test" } as unknown as ChatUser & { _id: string });

      // Should not call execute
      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });

    it("findUserById returns null when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);

      const result = await storeWithoutDitto.getState().findUserById("user-123");

      expect(result).toBeNull();
      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });

    it("markRoomAsRead returns early when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);

      await storeWithoutDitto.getState().markRoomAsRead("room-123");

      // Should not throw and should not call execute
      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });

    it("toggleRoomSubscription returns early when ditto is null", async () => {
      const storeWithoutDitto = createTestStore(null);

      await storeWithoutDitto.getState().toggleRoomSubscription("room-123");

      // Should not throw and should not call execute
      expect(mockDitto.store.execute).not.toHaveBeenCalled();
    });
  });

  describe("updateUser error handling", () => {
    it("handles error after findUserById succeeds", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      const currentUser = { _id: "user-123", name: "Old Name", subscriptions: {} };

      // First call succeeds (findUserById), second call fails (update)
      mockDitto.store.execute
        .mockResolvedValueOnce({ items: [{ value: currentUser }] })
        .mockRejectedValueOnce(new Error("Update Error"));

      await store.getState().updateUser({ _id: "user-123", name: "New Name" });

      expect(consoleSpy).toHaveBeenCalledWith("Error in updateUser:", expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
