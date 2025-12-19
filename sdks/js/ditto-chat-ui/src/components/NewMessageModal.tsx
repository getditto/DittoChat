import { AttachmentToken } from '@dittolive/ditto'
import { type ChatUser, useDittoChatStore } from '@dittolive/ditto-chat-core'
import React, { useState } from 'react'

import { useImageAttachment } from '../hooks/useImageAttachment'
import Avatar from './Avatar'
import { Icons } from './Icons'

interface NewMessageModalProps {
  onNewDMCreate: (user: ChatUser) => void
  onClose: () => void
}

const UserListItem = ({
  user,
  onSelect,
}: {
  user: ChatUser
  onSelect: (user: ChatUser) => void
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

  return (
    <li onClick={() => onSelect(user)}>
      <button className="w-full text-left px-4 py-3 flex items-center space-x-4 hover:bg-(--surface-color-light) transition-colors">
        <div className="relative">
          <Avatar isUser={true} imageUrl={imageUrl || undefined} />
          {/*// TODO: Add active status indicator*/}
          {/*{user.isActive && (
            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-(--active-status-bg) border-2 border-white"></span>
          )}*/}
        </div>
        <span className="font-semibold">{user.name}</span>
      </button>
    </li>
  )
}

function NewMessageModal({ onClose, onNewDMCreate }: NewMessageModalProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const users: ChatUser[] = useDittoChatStore((state) =>
    state.allUsers.filter((user) => user._id !== state.currentUser?._id),
  )

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-full bg-(--surface-color)">
      <header className="flex items-center justify-between p-4 border-b border-(--border-color) flex-shrink-0">
        <h1 className="text-xl font-bold">New Message</h1>
        <button
          onClick={onClose}
          className="text-(--text-color-lightest) hover:text-(--text-color-medium)"
        >
          <Icons.x className="w-6 h-6" />
        </button>
      </header>
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-color-faint)" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-(--secondary-bg) border border-(--border-color) rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--primary-color-focus)"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {filteredUsers.map((user) => (
            <UserListItem key={user._id} user={user} onSelect={onNewDMCreate} />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default NewMessageModal
