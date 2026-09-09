import { useSpacemanTheme } from '@space-man/react-theme-animation'

export function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme, ref } = useSpacemanTheme()

  return (
    <button ref={ref} onClick={toggleTheme} className="theme-toggle-btn">
      {resolvedTheme === 'light' ? '🌙' : '🌞'} {theme}
    </button>
  )
}