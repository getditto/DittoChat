import React, { useState } from 'react'

import { Icons } from './Icons'

interface NewRoomModalProps {
  onClose: () => void
  onCreateRoom: (roomName: string) => void
}

function NewRoomModal({ onClose, onCreateRoom }: NewRoomModalProps) {
  const [roomName, setRoomName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName.trim()) {
      onCreateRoom(roomName.trim())
    }
  }

  return (
    <div className="flex flex-col h-full bg-(--dc-surface-color)">
      <header className="flex items-center justify-between p-4 border-b border-(--dc-border-color) flex-shrink-0">
        <h1 className="text-xl font-bold">Create New Room</h1>
        <button
          onClick={onClose}
          className="text-(--dc-text-color-lightest) hover:text-(--dc-text-color-medium)"
        >
          <Icons.x className="w-6 h-6" />
        </button>
      </header>
      <form onSubmit={handleSubmit} className="p-4 flex-1 flex flex-col">
        <div className="space-y-2">
          <label
            htmlFor="room-name"
            className="text-sm font-medium text-[rgb(var(--dc-text-color-light))]"
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
            className="w-full bg-(--dc-secondary-bg) border border-(--dc-border-color) rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--dc-primary-color-focus)"
          />
        </div>
        <div className="mt-auto flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-(--dc-text-color-lighter) font-semibold bg-transparent hover:bg-(--dc-secondary-bg) transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!roomName.trim()}
            className="px-4 py-2 rounded-lg text-(--dc-text-on-primary) font-semibold bg-(--dc-primary-color) hover:bg-(--dc-primary-color-hover) disabled:bg-(--dc-disabled-bg) transition-colors"
          >
            Create Room
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewRoomModal
