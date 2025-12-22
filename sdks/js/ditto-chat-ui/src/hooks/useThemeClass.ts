import { useState } from 'react'

/**
 * Hook to get the current theme class.
 * This is used by Portal components to ensure they inherit the correct theme.
 *
 * @returns 'light' | 'dark' based on the current theme
 */
export function useThemeClass(): string {
    const [themeName] = useState(() => localStorage.getItem('ditto-web-chat-theme') || 'light')
    return themeName
}

