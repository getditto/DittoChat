import { useTheme } from './ThemeContext'

/**
 * Hook to get the current theme class.
 * This is used by Portal components to ensure they inherit the correct theme.
 *
 * @returns 'light' | 'dark' based on the current theme
 */
export function useThemeClass(): string {
    const { theme } = useTheme()
    return theme
}

