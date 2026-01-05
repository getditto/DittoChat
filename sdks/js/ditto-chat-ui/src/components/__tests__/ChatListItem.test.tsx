import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChatListItem from '../ChatListItem'
import type { Chat } from '../../types'
import type { ChatStore, ChatUser } from '@dittolive/ditto-chat-core'
import type { Attachment } from '@dittolive/ditto'

// Mock dependencies
vi.mock('../Avatar', () => ({
  default: ({ imageUrl }: { imageUrl?: string }) => (
    <div data-testid="avatar" data-image-url={imageUrl} />
  ),
}))

vi.mock('../../hooks/useImageAttachment', () => ({
  useImageAttachment: () => ({
    imageUrl: 'mock-url',
    progress: 0,
    isLoading: false,
    error: null,
    fetchImage: vi.fn(),
  }),
}))

const mockUseDittoChatStore = vi.fn()
vi.mock('@dittolive/ditto-chat-core', () => ({
  useDittoChatStore: <T,>(selector: (state: ChatStore) => T) =>
    mockUseDittoChatStore(selector),
}))

const mockChat: Chat = {
  id: 'chat-1',
  name: 'General',
  type: 'group',
  participants: [],
  messages: [
    {
      _id: 'msg-1',
      roomId: 'chat-1',
      text: 'Hello',
      createdOn: new Date().toISOString(),
      userId: 'user-2',
      isDeleted: false,
      isEdited: false,
      isArchived: false,
    },
  ],
}

const mockUsers: ChatUser[] = [
  {
    _id: 'user-1',
    name: 'Me',
    subscriptions: {},
    mentions: {},
  },
  {
    _id: 'user-2',
    name: 'Alice',
    subscriptions: {},
    mentions: {},
  },
]

describe('ChatListItem', () => {
  const defaultProps = {
    chat: mockChat,
    users: mockUsers,
    currentUserId: 'user-1',
    isSelected: false,
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        fetchAttachment: vi.fn(),
        currentUser: mockUsers[0],
        messagesByRoom: {
          'chat-1': [
            {
              id: 'msg-1',
              message: mockChat.messages[0],
              user: mockUsers[1],
            },
          ],
        },
      }
      return selector(state)
    })
  })

  it('renders chat name and last message', () => {
    render(<ChatListItem {...defaultProps} />)
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Alice:')).toBeInTheDocument()
  })

  it("renders 'You' for own messages", () => {
    const ownMessageChat = {
      ...mockChat,
      messages: [
        {
          ...mockChat.messages[0],
          userId: 'user-1',
        },
      ],
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        fetchAttachment: vi.fn(),
        currentUser: mockUsers[0],
        messagesByRoom: {
          'chat-1': [
            {
              id: 'msg-1',
              message: ownMessageChat.messages[0],
              user: mockUsers[0],
            },
          ],
        },
      }
      return selector(state)
    })

    render(<ChatListItem {...defaultProps} chat={ownMessageChat} />)
    expect(screen.getByText('You:')).toBeInTheDocument()
  })

  it('handles selection', () => {
    render(<ChatListItem {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(defaultProps.onSelect).toHaveBeenCalled()
  })

  it('displays unread count', () => {
    const unreadChat = { ...mockChat }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        fetchAttachment: vi.fn(),
        currentUser: {
          ...mockUsers[0],
          subscriptions: {
            'chat-1': new Date(Date.now() - 10000).toISOString(),
          },
        },
        messagesByRoom: {
          'chat-1': [
            {
              id: 'msg-1',
              message: {
                ...mockChat.messages[0],
                createdOn: new Date().toISOString(), // New message
              },
              user: mockUsers[1],
            },
          ],
        },
      }
      return selector(state)
    })

    render(<ChatListItem {...defaultProps} chat={unreadChat} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders DM chat name correctly', () => {
    const dmChat = {
      ...mockChat,
      type: 'dm' as const,
      participants: [
        { _id: 'user-1', name: 'Me' } as ChatUser,
        { _id: 'user-2', name: 'Alice' } as ChatUser,
      ],
    }

    render(<ChatListItem {...defaultProps} chat={dmChat} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('passes profile picture to Avatar for DM', () => {
    const dmChat = {
      ...mockChat,
      type: 'dm' as const,
      participants: [
        { _id: 'user-1', name: 'Me' } as ChatUser,
        { _id: 'user-2', name: 'Alice' } as ChatUser,
      ],
    }

    const mockUsersWithProfile = [
      mockUsers[0],
      {
        ...mockUsers[1],
        profilePictureThumbnail: {
          id: 'token-123',
          len: 100,
          metadata: {},
          idBytes: new Uint8Array(),
          token: 'token-123',
        } as unknown as Attachment,
      },
    ]

    render(
      <ChatListItem
        {...defaultProps}
        chat={dmChat}
        users={mockUsersWithProfile}
      />,
    )

    const avatar = screen.getByTestId('avatar')
    expect(avatar).toHaveAttribute('data-image-url', 'mock-url')
  })
  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <ChatListItem {...defaultProps} isSelected={true} />,
    )
    const button = container.querySelector('button')
    expect(button?.className).toContain('bg-(--dc-primary-color-light)')
    expect(button?.className).toContain('rounded-xl')
  })

  it("displays 'Image' for messages with thumbnailImageToken", () => {
    const imageMessageChat = {
      ...mockChat,
      messages: [
        {
          ...mockChat.messages[0],
          text: 'Check this out',
          thumbnailImageToken: {
            id: 'thumb-123',
            len: 0,
            metadata: {},
            idBytes: new Uint8Array(),
            token: 'thumb-123',
          } as unknown as Attachment,
        },
      ],
    }

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        currentUser: mockUsers[0],
        messagesByRoom: {
          'chat-1': [
            {
              id: 'msg-1',
              message: imageMessageChat.messages[0],
              user: mockUsers[1],
            },
          ],
        },
      }
      return selector(state)
    })

    render(<ChatListItem {...defaultProps} chat={imageMessageChat} />)
    expect(screen.getByText('Image')).toBeInTheDocument()
    expect(screen.queryByText('Check this out')).not.toBeInTheDocument()
  })

  it("displays '99+' for unread count over 99", () => {
    const manyUnreadMessages = Array.from({ length: 105 }, (_, i) => ({
      id: `msg-${i}`,
      message: {
        _id: `msg-${i}`,
        roomId: 'chat-1',
        text: `Message ${i}`,
        createdOn: new Date().toISOString(),
        userId: 'user-2',
        isDeleted: false,
        isEdited: false,
        isArchived: false,
      },
      user: mockUsers[1],
    }))

    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        currentUser: {
          ...mockUsers[0],
          subscriptions: {
            'chat-1': new Date(Date.now() - 100000).toISOString(),
          },
        },
        messagesByRoom: {
          'chat-1': manyUnreadMessages,
        },
      }
      return selector(state)
    })

    render(<ChatListItem {...defaultProps} />)
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('does not display unread count when chat is selected', () => {
    mockUseDittoChatStore.mockImplementation((selector) => {
      const state = {
        currentUser: {
          ...mockUsers[0],
          subscriptions: {
            'chat-1': new Date(Date.now() - 10000).toISOString(),
          },
        },
        messagesByRoom: {
          'chat-1': [
            {
              id: 'msg-1',
              message: {
                ...mockChat.messages[0],
                createdOn: new Date().toISOString(),
              },
              user: mockUsers[1],
            },
          ],
        },
      }
      return selector(state)
    })

    render(<ChatListItem {...defaultProps} isSelected={true} />)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})
