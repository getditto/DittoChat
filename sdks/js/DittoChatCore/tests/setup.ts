import { vi } from "vitest";
import { createStore } from "zustand";
import { createRoomSlice } from "../src/slices/useRooms";
import { createChatUserSlice } from "../src/slices/useChatUser";
import { createMessageSlice } from "../src/slices/useMessages";
import { ChatStore } from "../src/useChat";

// Mock Blob.arrayBuffer 
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function () {
    // simple mock buffer
    return new ArrayBuffer(0);
  };
}

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === "2d") {
    return {
      drawImage: vi.fn(),
    };
  }
  return null;
}) as any;

HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(["mock-image-data"], { type: "image/jpeg" }));
});

// Mock FileReader
global.FileReader = class {
  readAsDataURL() {
    // @ts-ignore
    this.onload({ target: { result: "data:image/png;base64,fake-data" } });
  }
  onload() {}
  onerror() {}
} as any;

// Mock Image
global.Image = class {
  width = 100;
  height = 100;
  constructor() {
    setTimeout(() => {
      // @ts-ignore
      this.onload();
    }, 10);
  }
  onload() {}
  onerror() {}
} as any;

export const createMockDitto = () => ({
  store: {
    execute: vi.fn().mockResolvedValue({ items: [] }),
    registerObserver: vi.fn().mockReturnValue({ stop: vi.fn() }),
    newAttachment: vi.fn().mockResolvedValue({
      id: "mock-attachment-token",
      len: 100,
      metadata: {},
    }),
    fetchAttachment: vi.fn(),
  },
  sync: {
    registerSubscription: vi.fn().mockReturnValue({ cancel: vi.fn() }),
  },
});

export const createTestStore = (mockDitto: any) => {
  const params = {
    ditto: mockDitto,
    userId: "test-user-id",
    userCollectionKey: "users",
  };

  return createStore<ChatStore>((set, get) => ({
    ...createRoomSlice(set, get, params),
    ...createChatUserSlice(set, get, params),
    ...createMessageSlice(set, get, params),
  }));
};
