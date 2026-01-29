import { useEffect, useMemo, useState } from 'react'

import type { Theme } from '../types'

const getSystemTheme = () => {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

export interface ChatThemeProviderProps {
  /** Theme configuration - can be 'light', 'dark', 'auto', or a custom Theme object */
  theme?: 'light' | 'dark' | 'auto' | Theme
  /** Child components to wrap with theme */
  children: React.ReactNode
  /** Additional className for the root div */
  className?: string
  /** Additional styles for the root div */
  style?: React.CSSProperties
}

/**
 * ChatThemeProvider wraps DittoChatUI components with theme support.
 * Handles light/dark/auto themes, system theme detection, and custom theme colors.
 *
 * @example
 * ```tsx
 * <ChatThemeProvider theme="light" style={{ height: '100%' }}>
 *   <ChatView chat={chat} roomId={roomId} />
 * </ChatThemeProvider>
 * ```
 *
 * @example With custom theme colors
 * ```tsx
 * const customTheme = {
 *   variant: 'dark',
 *   primaryColor: '#6366f1',
 *   textColor: '#ffffff',
 * }
 * <ChatThemeProvider theme={customTheme}>
 *   <ChatView chat={chat} />
 * </ChatThemeProvider>
 * ```
 */
export function ChatThemeProvider({
  theme = 'light',
  children,
  className = '',
  style = {},
}: ChatThemeProviderProps) {
  const [themeName, setThemeName] = useState(
    typeof theme === 'string'
      ? theme === 'auto'
        ? getSystemTheme()
        : theme
      : theme.variant || 'light',
  )

  // Listen to system theme changes when theme is 'auto'
  useEffect(() => {
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      setThemeName(newTheme)
    }

    if (theme === 'auto') {
      mediaQueryList.addEventListener('change', handleChange)
    } else {
      mediaQueryList.removeEventListener('change', handleChange)
      if (typeof theme === 'object') {
        setThemeName(theme.variant || 'light')
      } else {
        setThemeName(theme)
      }
    }

    return () => {
      mediaQueryList.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Convert custom theme object to CSS variables
  const themeStyles = useMemo(() => {
    if (typeof theme !== 'object') {
      return {}
    }

    const styles: React.CSSProperties = {}
    const mapping: Record<string, string> = {
      primaryColor: '--dc-primary-color',
      primaryColorHover: '--dc-primary-color-hover',
      primaryColorFocus: '--dc-primary-color-focus',
      primaryColorLight: '--dc-primary-color-light',
      primaryColorLighter: '--dc-primary-color-lighter',
      primaryColorLightBorder: '--dc-primary-color-light-border',
      primaryColorDarkText: '--dc-primary-color-dark-text',
      textOnPrimary: '--dc-text-on-primary',
      mentionText: '--dc-mention-text',
      mentionTextOnPrimary: '--dc-mention-text-on-primary',
      surfaceColor: '--dc-surface-color',
      surfaceColorLight: '--dc-surface-color-light',
      secondaryBg: '--dc-secondary-bg',
      secondaryBgHover: '--dc-secondary-bg-hover',
      disabledBg: '--dc-disabled-bg',
      textColor: '--dc-text-color',
      textColorMedium: '--dc-text-color-medium',
      textColorLight: '--dc-text-color-light',
      textColorLighter: '--dc-text-color-lighter',
      textColorLightest: '--dc-text-color-lightest',
      textColorFaint: '--dc-text-color-faint',
      textColorDisabled: '--dc-text-color-disabled',
      borderColor: '--dc-border-color',
      ringColor: '--dc-ring-color',
      editBg: '--dc-edit-bg',
      editText: '--dc-edit-text',
      infoIconColor: '--dc-info-icon-color',
      notificationBadgeBg: '--dc-notification-badge-bg',
      activeStatusBg: '--dc-active-status-bg',
      dangerText: '--dc-danger-text',
      dangerBg: '--dc-danger-bg',
      successBg: '--dc-success-bg',
      successText: '--dc-success-text',
    }

    Object.keys(theme).forEach((key) => {
      if (key in mapping) {
        // @ts-expect-error - key is a valid key of Theme
        styles[mapping[key]] = theme[key as keyof Theme]
      }
    })

    return styles
  }, [theme])

  // Persist theme name to localStorage
  useEffect(() => {
    localStorage.setItem('ditto-web-chat-theme', themeName)
    return () => {
      localStorage.removeItem('ditto-web-chat-theme')
    }
  }, [themeName])

  return (
    <div
      className={`dcui-root ${themeName} ${className}`.trim()}
      style={{ ...themeStyles, ...style }}
    >
      {children}
    </div>
  )
}
