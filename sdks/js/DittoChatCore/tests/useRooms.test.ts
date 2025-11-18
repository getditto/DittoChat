import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockDitto, createTestStore } from "./setup";

describe("useRooms Slice", () => {
  let store: ReturnType<typeof createTestStore>;
  let mockDitto: any;

  beforeEach(() => {
    mockDitto = createMockDitto();
    store = createTestStore(mockDitto);
  });

  it("initializes subscriptions for rooms", () => {
    expect(mockDitto.sync.registerSubscription).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * from rooms")
    );
  });

  it("createRoom executes correct INSERT query", async () => {
    const roomName = "General";
    await store.getState().createRoom(roomName);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO `rooms` DOCUMENTS (:newDoc)"),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          name: roomName,
          createdBy: "test-user-id",
          collectionId: "rooms",
        }),
      })
    );
  });

  it("createDMRoom executes correct INSERT query with participants", async () => {
    const targetUser = {
      _id: "other-user",
      name: "Alice",
      subscriptions: {},
      mentions: {},
    };
    store.setState({
      currentUser: {
        _id: "test-user-id",
        name: "Bob",
        subscriptions: {},
        mentions: {},
      },
    });

    await store.getState().createDMRoom(targetUser);

    expect(mockDitto.store.execute).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO `dm_rooms`"),
      expect.objectContaining({
        newDoc: expect.objectContaining({
          collectionId: "dm_rooms",
          participants: ["test-user-id", "other-user"],
        }),
      })
    );
  });

  it("updates local state when Ditto observer receives new rooms", () => {
    let observerCallback: any;

    mockDitto.store.registerObserver = vi.fn((query, cb) => {
      if (query.toLowerCase().includes("from rooms")) {
        observerCallback = cb;
      }
      return { stop: vi.fn() };
    });

    store = createTestStore(mockDitto);

    expect(observerCallback).toBeDefined();

    const newRoom = {
      _id: "new-room",
      name: "Observer Room",
      collectionId: "rooms",
    };

    observerCallback({
      items: [{ value: newRoom }],
    });

    expect(store.getState().rooms).toHaveLength(1);
    expect(store.getState().rooms[0].name).toBe("Observer Room");
  });
});
