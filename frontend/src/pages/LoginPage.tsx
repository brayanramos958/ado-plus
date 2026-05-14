import { useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getPATStatus, updatePAT } from '@/api/client'
import { Spinner } from '@/components/Spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Tab = 'login' | 'register'

export function LoginPage() {
  const { register: authRegister, setAuth } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pat, setPat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── PAT modal (post-login) ─────────────────────────────────────────────
  const [showPATModal, setShowPATModal] = useState(false)
  const [patValue, setPatValue] = useState('')
  const [patError, setPatError] = useState('')
  const [patLoading, setPatLoading] = useState(false)
  const [patStatusMessage, setPatStatusMessage] = useState('')
  const [tempUser, setTempUser] = useState<{ id: number; email: string } | null>(null)
  const [tempToken, setTempToken] = useState<string | null>(null)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setPat('')
    setError('')
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    resetForm()
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Login directo (sin pasar por AuthContext todavía)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      const user = data.user as { id: number; email: string }
      const token = data.token as string

      // 2. Guardar JWT temporal en localStorage para que getPATStatus tenga auth
      localStorage.setItem('ado-plus-auth', JSON.stringify({ user, token }))

      // 3. Verificar si el PAT del usuario sigue funcionando
      const patStatus = await getPATStatus()

      if (patStatus.valid) {
        // ✅ PAT válido → entrar al board
        setAuth({ user, token })
      } else {
        // ❌ PAT inválido o no existe → mostrar modal para actualizar
        setTempUser(user)
        setTempToken(token)
        setPatStatusMessage(patStatus.message || 'Tu API Key está vencida o no tiene los permisos necesarios.')
        setShowPATModal(true)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handlePATSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPatError('')

    if (!patValue || patValue.length < 30) {
      setPatError('El PAT debe tener al menos 30 caracteres')
      return
    }

    setPatLoading(true)
    try {
      await updatePAT(patValue)
      // ✅ PAT verificado y guardado → entrar al board
      if (tempUser && tempToken) {
        setAuth({ user: tempUser, token: tempToken })
      }
    } catch (err) {
      setPatError((err as Error).message)
    } finally {
      setPatLoading(false)
    }
  }

  const handleCancelPAT = () => {
    setShowPATModal(false)
    setPatValue('')
    setPatError('')
    setPatStatusMessage('')
    setTempUser(null)
    setTempToken(null)
    localStorage.removeItem('ado-plus-auth')
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validación client-side
    if (!email.endsWith('@itsinfocom.com')) {
      setError('Solo se permiten emails @itsinfocom.com')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (pat.length < 30) {
      setError('El PAT de Azure DevOps debe tener al menos 30 caracteres')
      return
    }

    setLoading(true)
    try {
      await authRegister(email, password, pat)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Fondo sutil con gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg mb-3">
            <span className="text-primary-foreground font-bold text-2xl">AD</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">ADO Plus</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión interna del equipo itsinfocom</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'text-foreground border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'text-foreground border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={tab === 'login' ? handleLogin : handleRegister}
            className="p-6 space-y-4"
          >
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@itsinfocom.com"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                  transition-colors"
              />
            </div>

            {/* PAT (solo registro) */}
            {tab === 'register' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="pat" className="block text-sm font-medium text-foreground">
                    API Key de Azure DevOps
                  </label>
                  <input
                    id="pat"
                    type="password"
                    value={pat}
                    onChange={(e) => setPat(e.target.value)}
                    placeholder="PAT de dev.azure.com"
                    required
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm
                      placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                      transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtenelo en{' '}
                    <a
                      href="https://dev.azure.com/itsinfocom/_usersSettings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      dev.azure.com
                    </a>{' '}
                    → User Settings → Personal Access Tokens
                  </p>
                </div>

                {/* PAT scopes info */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Al crear el token, marcá estos tres permisos:</p>
                  <div className="space-y-1.5">
                    <ScopeRow
                      label="Work Items → Read, write, & manage"
                      desc="Tareas, estados, comentarios, tags"
                    />
                    <ScopeRow
                      label="Project and Team → Read, write, & manage"
                      desc="Sprints, miembros del equipo"
                    />
                    <ScopeRow
                      label="Identity → Read"
                      desc="Avatares y nombres de los integrantes"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    No necesita acceso a Code, Build, Release ni otros scopes.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-lg
                hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity
                flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              {tab === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>

      {/* ── PAT Setup Modal (post-login) ───────────────────────────────── */}
      <Dialog open={showPATModal} onOpenChange={(open) => {
        if (!open) handleCancelPAT()
        setShowPATModal(open)
      }} disablePointerDismissal>
        <DialogContent className="max-w-sm sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Actualizar API Key</DialogTitle>
            <DialogDescription>
              {patStatusMessage || 'Tu API Key de Azure DevOps expiró o no es válida. Ingresá una nueva para continuar.'}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handlePATSubmit}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pat-modal">Nueva API Key de Azure DevOps</Label>
              <Input
                id="pat-modal"
                type="password"
                value={patValue}
                onChange={(e) => setPatValue(e.target.value)}
                placeholder="Pegá tu API Key aquí"
                disabled={patLoading}
              />
            </div>

            {/* PAT scopes info */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Al crear el token, marcá estos tres permisos:</p>
              <div className="space-y-1.5">
                <ScopeRow
                  label="Work Items → Read, write, & manage"
                  desc="Tareas, estados, comentarios, tags"
                />
                <ScopeRow
                  label="Project and Team → Read, write, & manage"
                  desc="Sprints, miembros del equipo"
                />
                <ScopeRow
                  label="Identity → Read"
                  desc="Avatares y nombres de los integrantes"
                />
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

            {patError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {patError}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelPAT}
                disabled={patLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={patLoading}
              >
                {patLoading ? 'Verificando...' : 'Verificar y continuar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Ícono de check verde + texto para cada scope requerido del PAT. */
function ScopeRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <div className="min-w-0">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
