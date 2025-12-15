import React, { useState } from "react";
import { Icons } from "./Icons";

interface NewRoomModalProps {
  onClose: () => void;
  onCreateRoom: (roomName: string) => void;
}

function NewRoomModal({ onClose, onCreateRoom }: NewRoomModalProps) {
  const [roomName, setRoomName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim());
    }
  };

  return (
    <div className="flex flex-col h-full bg-(--surface-color)">
      <header className="flex items-center justify-between p-4 border-b border-(--border-color) flex-shrink-0">
        <h1 className="text-xl font-bold">Create New Room</h1>
        <button
          onClick={onClose}
          className="text-(--text-color-lightest) hover:text-(--text-color-medium)"
        >
          <Icons.x className="w-6 h-6" />
        </button>
      </header>
      <form onSubmit={handleSubmit} className="p-4 flex-1 flex flex-col">
        <div className="space-y-2">
          <label
            htmlFor="room-name"
            className="text-sm font-medium text-[rgb(var(--text-color-light))]"
          >
            Room Name
          </label>
          <input
            id="room-name"
            type="text"
            placeholder="e.g. #project-alpha"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            autoFocus
            className="w-full bg-(--secondary-bg) border border-(--border-color) rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--primary-color-focus)"
          />
        </div>
        <div className="mt-auto flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-(--text-color-lighter) font-semibold bg-transparent hover:bg-(--secondary-bg) transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!roomName.trim()}
            className="px-4 py-2 rounded-lg text-(--text-on-primary) font-semibold bg-(--primary-color) hover:bg-(--primary-color-hover) disabled:bg-(--disabled-bg) transition-colors"
          >
            Create Room
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewRoomModal;
