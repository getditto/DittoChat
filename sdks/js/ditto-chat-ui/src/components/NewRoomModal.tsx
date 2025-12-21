import * as Dialog from '@radix-ui/react-dialog'
import React, { useState } from 'react'

import { Icons } from './Icons'

interface NewRoomModalProps {
  onClose: () => void
  onCreateRoom: (roomName: string) => void
  open: boolean
}

function NewRoomModal({ onClose, onCreateRoom, open }: NewRoomModalProps) {
  const [roomName, setRoomName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomName.trim()) {
      onCreateRoom(roomName.trim())
      onClose()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed inset-0 z-50 md:inset-[50%] md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:w-[90vw] md:max-w-[500px] md:h-[85vh] md:max-h-[400px] flex flex-col bg-(--dc-surface-color) md:rounded-lg md:shadow-lg outline-none">
          <Dialog.Title className="sr-only">Create New Room</Dialog.Title>
          <header className="flex items-center justify-between p-4 border-b border-(--dc-border-color) flex-shrink-0">
            <Dialog.Title className="text-xl font-bold">Create New Room</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-(--dc-text-color-lightest) hover:text-(--dc-text-color-medium) outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
                aria-label="Close"
              >
                <Icons.x className="w-6 h-6" />
              </button>
            </Dialog.Close>
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
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-(--dc-text-color-lighter) font-semibold bg-transparent hover:bg-(--dc-secondary-bg) transition-colors outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!roomName.trim()}
                className="px-4 py-2 rounded-lg text-(--dc-text-on-primary) font-semibold bg-(--dc-primary-color) hover:bg-(--dc-primary-color-hover) disabled:bg-(--dc-disabled-bg) transition-colors outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
              >
                Create Room
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default NewRoomModal
