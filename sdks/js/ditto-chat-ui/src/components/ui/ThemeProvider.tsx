import { ThemeContext } from './ThemeContext'

export const ThemeProvider = ({
    children,
    theme,
}: {
    children: React.ReactNode
    theme: 'light' | 'dark'
}) => {
    return (
        <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>
    )
}
