import { useThemeAnimation } from '@space-man/react-theme-animation'

export function ThemeToggle() {
  const { theme, toggleTheme, ref } = useThemeAnimation()

  return (
    <button ref={ref} onClick={toggleTheme} className="theme-toggle-btn">
      {theme === 'light' ? '🌙' : '🌞'} {theme}
    </button>
  )
}