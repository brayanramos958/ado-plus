import { useHealth } from '../hooks/useWorkItems'
import { useBoardStore } from '../store/boardStore'
import { useTheme } from '../context/ThemeContext'

interface HeaderProps {
  onNewTask?: () => void
}

export function Header({ onNewTask }: HeaderProps) {
  const { data: health } = useHealth()
  const { viewMode, setViewMode } = useBoardStore()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-card border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">AD</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">ADO Plus</h1>
            <p className="text-xs text-muted-foreground">
              {health?.project || 'Cargando...'}
            </p>
          </div>
        </div>

        {/* Connection Status - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {health?.status === 'ok' ? 'Conectado' : 'Error'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* View Toggle - hidden on small screens */}
          <div className="hidden sm:flex items-center bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Lista
            </button>
          </div>

          {/* New Task Button - hidden on mobile */}
          <button
            onClick={onNewTask}
            className="hidden sm:block px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
          >
            + Nueva Tarea
          </button>
        </div>
      </div>
    </header>
  )
}