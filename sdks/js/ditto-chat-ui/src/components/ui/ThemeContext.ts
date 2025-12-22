import { createContext, useContext } from 'react'

export interface ThemeContextType {
    theme: 'light' | 'dark'
}

export const ThemeContext = createContext<ThemeContextType>({
    theme: 'light',
})

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
