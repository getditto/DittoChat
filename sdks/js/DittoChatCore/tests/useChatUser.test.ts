import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockDitto, createTestStore } from "./setup";

describe("useChatUser Slice", () => {
  let store: ReturnType<typeof createTestStore>;
  let mockDitto: any;

  beforeEach(() => {
    mockDitto = createMockDitto();
    store = createTestStore(mockDitto);
  });

  it("addUser executes correct INSERT query", async () => {
    const newUser = { name: "New User", subscriptions: {}, mentions: {} };
    await store.getState().addUser(newUser);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users DOCUMENTS (:newUser)"),
      expect.objectContaining({ newUser })
    );
  });

  it("findUserById executes correct SELECT query", async () => {
    const mockUser = { _id: "user-123", name: "Found Me" };
    mockDitto.store.execute.mockResolvedValueOnce({ items: [{ value: mockUser }] });

    const result = await store.getState().findUserById("user-123");

    expect(result).toEqual(mockUser);
    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM users WHERE _id = :id"),
      { id: "user-123" }
    );
  });

  it("updateUser fetches current user, merges data, and updates DB", async () => {
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

  it("subscribeToRoom updates the user subscription list", async () => {
    const mockUser = { _id: "test-user-id", subscriptions: {} };

    mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

    await store.getState().subscribeToRoom("room-123");

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      expect.objectContaining({
        newUser: expect.objectContaining({
          _id: "test-user-id",
          subscriptions: expect.objectContaining({
            "room-123": expect.any(String),
          }),
        }),
      })
    );
  });
  
  it("markRoomAsRead updates timestamps and clears mentions", async () => {
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

  it("unsubscribeFromRoom removes room from subscriptions", async () => {
    const roomId = "room-to-leave";

    const mockUser = {
      _id: "test-user-id",
      subscriptions: { [roomId]: "2023-01-01", "other-room": "2023-01-01" },
    };
    mockDitto.store.execute.mockResolvedValue({ items: [{ value: mockUser }] });

    await store.getState().unsubscribeFromRoom(roomId);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      expect.objectContaining({
        newUser: expect.objectContaining({
          subscriptions: { "other-room": "2023-01-01" }, 
        }),
      })
    );
  });
});
