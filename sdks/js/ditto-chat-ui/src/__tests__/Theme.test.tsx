import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import DittoChatUI from '../DittoChatUI'
import { Theme } from '../types'

// Mocking dependencies
vi.mock('@dittolive/ditto-chat-core', () => ({
  useDittoChat: vi.fn(),
  useDittoChatStore: vi.fn((selector) => {
    const mockState = {
      createDMRoom: vi.fn(),
      createRoom: vi.fn(),
      rooms: [],
      allUsers: [],
      currentUser: null,
      roomsLoading: false,
      usersLoading: false,
      messagesLoading: false,
      messagesByRoom: {},
      setActiveRoomId: vi.fn(),
      canPerformAction: vi.fn(() => true),
    }
    return selector(mockState)
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
  Toaster: () => null,
}))

describe('DittoChatUI Theme Customization', () => {
  const mockProps = {
    ditto: {} as any,
    userCollectionKey: 'users',
    userId: 'test-user',
  }

  it('applies theme values to CSS variables when a theme object is passed', () => {
    const customTheme: Theme = {
      primaryColor: '#ff0000',
      surfaceColor: '#00ff00',
      textColor: '#0000ff',
      variant: 'dark',
    }

    const { container } = render(
      <DittoChatUI {...mockProps} theme={customTheme} />,
    )

    const rootElement = container.querySelector('.dcui-root') as HTMLElement
    expect(rootElement).toBeTruthy()

    // Check if style attribute contains the mapped variables
    expect(rootElement.style.getPropertyValue('--dc-primary-color')).toBe(
      '#ff0000',
    )
    expect(rootElement.style.getPropertyValue('--dc-surface-color')).toBe(
      '#00ff00',
    )
    expect(rootElement.style.getPropertyValue('--dc-text-color')).toBe(
      '#0000ff',
    )
  })

  it('sets the correct theme class based on variant', () => {
    const customTheme: Theme = {
      variant: 'dark',
    }

    const { container } = render(
      <DittoChatUI {...mockProps} theme={customTheme} />,
    )

    // The dcui-root element should have the class 'dark'
    const themeWrapper = container.querySelector('.dcui-root')
    expect(themeWrapper).toHaveClass('dark')
  })

  it('defaults to light variant if not specified in theme object', () => {
    const customTheme: Theme = {
      primaryColor: '#123456',
    }

    const { container } = render(
      <DittoChatUI {...mockProps} theme={customTheme} />,
    )

    const themeWrapper = container.querySelector('.dcui-root')
    expect(themeWrapper).toHaveClass('light')
  })
})
