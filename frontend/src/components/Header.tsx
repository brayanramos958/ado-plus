import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Key, KeyRound } from 'lucide-react'
import { useHealth } from '../hooks/useWorkItems'
import { useBoardStore } from '../store/boardStore'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { changePassword, updatePAT } from '../api/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface HeaderProps {
  onNewTask?: () => void
}

export function Header({ onNewTask }: HeaderProps) {
  const { data: health } = useHealth()
  const { viewMode, setViewMode, filterAssigned, sprintPath } = useBoardStore()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  // ─── Password change dialog ─────────────────────────────────────────────────
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSubmitting, setPwSubmitting] = useState(false)

  const resetPasswordForm = () => {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setPwSubmitting(false)
  }

  // ─── PAT update dialog ───────────────────────────────────────────────────
  const [patOpen, setPatOpen] = useState(false)
  const [patValue, setPatValue] = useState('')
  const [patSubmitting, setPatSubmitting] = useState(false)

  useEffect(() => {
    const handler = () => setPatOpen(true)
    window.addEventListener('auth:pat_expired', handler)
    return () => window.removeEventListener('auth:pat_expired', handler)
  }, [])

  const resetPatForm = () => {
    setPatValue('')
    setPatSubmitting(false)
  }

  const handleUpdatePAT = async () => {
    if (!patValue || patValue.length < 30) {
      toast.error('La API Key debe tener al menos 30 caracteres')
      return
    }

    setPatSubmitting(true)
    try {
      const res = await updatePAT(patValue)
      toast.success(res.message || 'API Key verificada y guardada')
      setPatOpen(false)
      resetPatForm()
    } catch (err) {
      toast.error((err as Error).message || 'Error al actualizar API Key')
    } finally {
      setPatSubmitting(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPw.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPw !== confirmPw) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (!currentPw) {
      toast.error('Ingresá tu contraseña actual')
      return
    }

    setPwSubmitting(true)
    try {
      const res = await changePassword(currentPw, newPw)
      toast.success(res.message || 'Contraseña actualizada')
      setPasswordOpen(false)
      resetPasswordForm()
    } catch (err) {
      toast.error((err as Error).message || 'Error al cambiar la contraseña')
    } finally {
      setPwSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)

    // Siempre recarga workitems del sprint activo
    await queryClient.invalidateQueries({ queryKey: ['workitems', sprintPath] })

    // Si está en vista de equipo completo, recarga también epics, features y tags
    // Si está en tablero de una persona, omite estas queries para no cargar de más
    if (!filterAssigned) {
      await queryClient.invalidateQueries({ queryKey: ['epics'] })
      await queryClient.invalidateQueries({ queryKey: ['features'] })
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
    }

    setRefreshing(false)
  }

  return (
    <>
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
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Recargar datos"
          >
            <svg
              className={`w-5 h-5 text-foreground ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

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

          {/* User email + Password change + Logout */}
          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-sm text-muted-foreground">
                {user.email}
              </span>
              <button
                onClick={() => setPasswordOpen(true)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Cambiar contraseña"
                title="Cambiar contraseña"
              >
                <Key className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => setPatOpen(true)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Actualizar PAT"
                title="Actualizar PAT"
              >
                <KeyRound className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* ─── Password change dialog ─────────────────────────────────────────── */}
    <Dialog open={passwordOpen} onOpenChange={(open) => {
      if (!open) resetPasswordForm()
      setPasswordOpen(open)
    }} disablePointerDismissal>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Actualizá la contraseña de tu cuenta.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); handleChangePassword() }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-current">Contraseña actual</Label>
            <Input
              id="pw-current"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              disabled={pwSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-new">Nueva contraseña</Label>
            <Input
              id="pw-new"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              disabled={pwSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-confirm">Confirmar nueva contraseña</Label>
            <Input
              id="pw-confirm"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              disabled={pwSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={pwSubmitting}
            >
              {pwSubmitting ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* ─── PAT update dialog ─────────────────────────────────────────────── */}
    <Dialog open={patOpen} onOpenChange={(open) => {
      if (!open) resetPatForm()
      setPatOpen(open)
    }} disablePointerDismissal>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Actualizar API Key</DialogTitle>
          <DialogDescription>
            Ingresá tu nuevo Personal Access Token de Azure DevOps.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); handleUpdatePAT() }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pat-value">Nueva API Key de Azure DevOps</Label>
            <Input
              id="pat-value"
              type="password"
              value={patValue}
              onChange={(e) => setPatValue(e.target.value)}
              placeholder="Pegá tu API Key aquí"
              disabled={patSubmitting}
            />
          </div>

          {/* PAT scopes info */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Al crear el token, marcá estos tres permisos:</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-foreground">Work Items → Read, write, &amp; manage</span>
                  <p className="text-[11px] text-muted-foreground">Tareas, estados, comentarios, tags</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-foreground">Project and Team → Read, write, &amp; manage</span>
                  <p className="text-[11px] text-muted-foreground">Sprints, miembros del equipo</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-foreground">Identity → Read</span>
                  <p className="text-[11px] text-muted-foreground">Avatares y nombres de los integrantes</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              No necesita acceso a Code, Build, Release ni otros scopes.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            <a
              href="https://dev.azure.com/itsinfocom/_usersSettings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              ¿Dónde obtengo mi API Key?
            </a>
          </p>

          <DialogFooter>
            <Button
              type="submit"
              disabled={patSubmitting}
            >
              {patSubmitting ? 'Verificando...' : 'Verificar y guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}