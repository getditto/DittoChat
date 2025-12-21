import { AttachmentToken } from '@dittolive/ditto'
import { type ChatUser, useDittoChatStore } from '@dittolive/ditto-chat-core'
import * as Dialog from '@radix-ui/react-dialog'
import React, { useState } from 'react'

import { useImageAttachment } from '../hooks/useImageAttachment'
import Avatar from './Avatar'
import { Icons } from './Icons'

interface NewMessageModalProps {
  onNewDMCreate: (user: ChatUser) => void
  onClose: () => void
  open: boolean
}

const UserListItem = ({
  user,
  onSelect,
  onClose,
}: {
  user: ChatUser
  onSelect: (user: ChatUser) => void
  onClose: () => void
}) => {
  const fetchAttachment = useDittoChatStore((state) => state.fetchAttachment)
  const profilePictureThumbnail = user.profilePictureThumbnail

  const { imageUrl } = useImageAttachment({
    token: profilePictureThumbnail
      ? (profilePictureThumbnail as unknown as AttachmentToken)
      : null,
    fetchAttachment,
    autoFetch: true,
  })

  const handleClick = () => {
    onSelect(user)
    onClose()
  }

  return (
    <li>
      <button
        onClick={handleClick}
        className="w-full text-left px-4 py-3 flex items-center space-x-4 hover:bg-(--dc-surface-color-light) transition-colors outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
      >
        <div className="relative">
          <Avatar isUser={true} imageUrl={imageUrl || undefined} />
        </div>
        <span className="font-semibold">{user.name}</span>
      </button>
    </li>
  )
}

function NewMessageModal({ onClose, onNewDMCreate, open }: NewMessageModalProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const users: ChatUser[] = useDittoChatStore((state) =>
    state.allUsers.filter((user) => user._id !== state.currentUser?._id),
  )

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content className="fixed inset-0 z-50 md:inset-[50%] md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:w-[90vw] md:max-w-[500px] md:h-[85vh] md:max-h-[600px] flex flex-col bg-(--dc-surface-color) md:rounded-lg md:shadow-lg outline-none">
          <Dialog.Title className="sr-only">New Message</Dialog.Title>
          <header className="flex items-center justify-between p-4 border-b border-(--dc-border-color) flex-shrink-0">
            <Dialog.Title className="text-xl font-bold">New Message</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-(--dc-text-color-lightest) hover:text-(--dc-text-color-medium) outline-none focus:outline-none focus-visible:ring-(--dc-ring-color) focus-visible:ring-[3px] focus:ring-offset-1 ring-offset-(--dc-surface-color)"
                aria-label="Close"
              >
                <Icons.x className="w-6 h-6" />
              </button>
            </Dialog.Close>
          </header>
          <div className="p-4 flex-shrink-0">
            <div className="relative">
              <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--dc-text-color-faint)" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-(--dc-secondary-bg) border border-(--dc-border-color) rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--dc-primary-color-focus)"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ul>
              {filteredUsers.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  onSelect={onNewDMCreate}
                  onClose={onClose}
                />
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default NewMessageModal
