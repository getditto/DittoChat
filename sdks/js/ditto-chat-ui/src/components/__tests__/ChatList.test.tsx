import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChatList from '../ChatList'
import type { Chat } from '../../types'

// Mock dependencies
vi.mock('../ChatListItem', () => ({
  default: ({
    chat,
    onSelect,
    isSelected,
  }: {
    chat: Chat
    onSelect: (chat: Chat) => void
    isSelected: boolean
  }) => (
    <div
      data-testid={`chat-item-${chat.id}`}
      onClick={() => onSelect(chat)}
      data-selected={isSelected}
    >
      {chat.name}
    </div>
  ),
}))

vi.mock('../Icons', () => ({
  Icons: {
    chevronDown: () => <div data-testid="icon-chevron-down" />,
    search: () => <div data-testid="icon-search" />,
  },
}))

vi.mock('@dittolive/ditto-chat-core', () => ({
  useDittoChatStore: vi.fn((selector) =>
    selector({ allUsers: [], currentUser: { _id: 'user-1' } }),
  ),
}))

// Mock usePermissions
import { usePermissions } from '../../utils/usePermissions'
vi.mock('../../utils/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canCreateRoom: true,
    canPerformAction: vi.fn(),
    canEditOwnMessage: true,
    canDeleteOwnMessage: true,
    canAddReaction: true,
    canRemoveOwnReaction: true,
    canMentionUsers: true,
    canSubscribeToRoom: true,
  })),
}))

// Mock react-virtualized
vi.mock('react-virtualized', () => ({
  List: ({
    rowRenderer,
    rowCount,
  }: {
    rowRenderer: (args: {
      index: number
      key: string
      style: React.CSSProperties
    }) => React.ReactNode
    rowCount: number
  }) => (
    <div>
      {Array.from({ length: rowCount }).map((_, index) =>
        rowRenderer({ index, key: String(index), style: {} }),
      )}
    </div>
  ),
  AutoSizer: ({
    children,
  }: {
    children: (size: { height: number; width: number }) => React.ReactNode
  }) => children({ height: 600, width: 400 }),
  CellMeasurer: ({ children }: { children: React.ReactNode }) => children,
  CellMeasurerCache: class {
    rowHeight = 60
  },
}))

const mockChats: Chat[] = [
  {
    id: 'chat-1',
    name: 'General',
    type: 'group',
    participants: [],
    messages: [],
  },
  {
    id: 'chat-2',
    name: 'Alice',
    type: 'dm',
    participants: [],
    messages: [],
  },
]

describe('ChatList', () => {
  const defaultProps = {
    chats: mockChats,
    onSelectChat: vi.fn(),
    onNewMessage: vi.fn(),
    selectedChatId: null,
  }

  it('renders list of chats', () => {
    render(<ChatList {...defaultProps} />)
    expect(screen.getByText('Chats')).toBeInTheDocument()
    expect(screen.getByTestId('chat-item-chat-1')).toBeInTheDocument()
    expect(screen.getByTestId('chat-item-chat-2')).toBeInTheDocument()
  })

  it('filters chats based on search', () => {
    render(<ChatList {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText('Search')
    fireEvent.change(searchInput, { target: { value: 'Alice' } })

    expect(screen.queryByTestId('chat-item-chat-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('chat-item-chat-2')).toBeInTheDocument()
  })

  it('handles chat selection', () => {
    render(<ChatList {...defaultProps} />)
    fireEvent.click(screen.getByTestId('chat-item-chat-1'))
    expect(defaultProps.onSelectChat).toHaveBeenCalledWith(mockChats[0])
  })

  // Note: Radix DropdownMenu Portal rendering doesn't work properly in jsdom
  // These tests would work in a real browser environment
  it.skip('toggles dropdown menu', async () => {
    render(<ChatList {...defaultProps} />)
    const dropdownButton =
      screen.getByTestId('icon-chevron-down').parentElement!

    fireEvent.click(dropdownButton)
    await waitFor(() => {
      expect(screen.getByText('New Room')).toBeInTheDocument()
    })

    fireEvent.click(dropdownButton)
    await waitFor(() => {
      expect(screen.queryByText('New Room')).not.toBeInTheDocument()
    })
  })

  it.skip('handles new room selection from dropdown', async () => {
    render(<ChatList {...defaultProps} />)
    const dropdownButton =
      screen.getByTestId('icon-chevron-down').parentElement!

    fireEvent.click(dropdownButton)

    await waitFor(() => {
      expect(screen.getByText('New Room')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Room'))

    expect(defaultProps.onNewMessage).toHaveBeenCalledWith('newRoom')

    await waitFor(() => {
      expect(screen.queryByText('New Room')).not.toBeInTheDocument()
    })
  })

  // Note: Closing dropdown on outside click is handled by Radix internally
  // We don't need to test Radix's implementation details


  it('shows empty list when search yields no results', () => {
    render(<ChatList {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText('Search')
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } })

    expect(screen.queryByTestId('chat-item-chat-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('chat-item-chat-2')).not.toBeInTheDocument()
  })

  it("filters DM chats with no name using 'DM' fallback", () => {
    const chatsWithUnnamedDM: Chat[] = [
      {
        id: 'chat-dm',
        name: '', // Empty name for DM
        type: 'dm',
        participants: [],
        messages: [],
      },
    ]

    render(<ChatList {...defaultProps} chats={chatsWithUnnamedDM} />)
    const searchInput = screen.getByPlaceholderText('Search')

    // Search for "DM" should find the unnamed DM chat
    fireEvent.change(searchInput, { target: { value: 'DM' } })
    expect(screen.getByTestId('chat-item-chat-dm')).toBeInTheDocument()
  })

  it('scrolls to selected chat when provided', () => {
    render(<ChatList {...defaultProps} selectedChatId="chat-2" />)

    // Verify the selected chat is marked as selected
    const selectedChat = screen.getByTestId('chat-item-chat-2')
    expect(selectedChat).toHaveAttribute('data-selected', 'true')
  })

  it('hides New Room option when canCreateRoom permission is false', () => {
    // Mock usePermissions to return false for canCreateRoom
    vi.mocked(usePermissions).mockReturnValue({
      canCreateRoom: false,
      canPerformAction: vi.fn(),
      canEditOwnMessage: true,
      canDeleteOwnMessage: true,
      canAddReaction: true,
      canRemoveOwnReaction: true,
      canMentionUsers: true,
      canSubscribeToRoom: true,
    })

    render(<ChatList {...defaultProps} />)

    // The dropdown button (chevron down) should not be present
    expect(screen.queryByTestId('icon-chevron-down')).not.toBeInTheDocument()

    // Consequently, "New Room" option cannot be accessed/seen
    expect(screen.queryByText('New Room')).not.toBeInTheDocument()
  })
})
