import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

interface UserInfo {
  id: number
  email: string
}

interface AuthState {
  user: UserInfo | null
  token: string | null
}

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, pat: string) => Promise<void>
  logout: () => void
  /** Establece el estado de autenticación directamente (usado después de verificar PAT). */
  setAuth: (state: AuthState) => void
}

const AUTH_STORAGE_KEY = 'ado-plus-auth'

function readStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return { user: null, token: null }
    const parsed = JSON.parse(raw) as AuthState
    // Validación mínima contra corrupción
    if (!parsed.token || !parsed.user?.id || !parsed.user.email) {
      return { user: null, token: null }
    }
    return parsed
  } catch {
    return { user: null, token: null }
  }
}

function persistAuth(state: AuthState) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(readStoredAuth)

  // Escuchar evento global de logout (emitido por client.ts ante 401)
  useEffect(() => {
    const handler = () => {
      setAuth({ user: null, token: null })
      clearAuth()
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // Limpiar sesión anterior
    clearSessionState()
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión')
    }
    const state: AuthState = { user: data.user, token: data.token }
    persistAuth(state)
    setAuth(state)
  }, [])

  const register = useCallback(async (email: string, password: string, pat: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, pat }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Error al crear la cuenta')
    }
    const state: AuthState = { user: data.user, token: data.token }
    persistAuth(state)
    setAuth(state)
  }, [])

  const logout = useCallback(() => {
    setAuth({ user: null, token: null })
    clearAuth()
    clearSessionState()
  }, [])

  const setAuthState = useCallback((state: AuthState) => {
    persistAuth(state)
    setAuth(state)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        token: auth.token,
        isAuthenticated: !!auth.token,
        login,
        register,
        logout,
        setAuth: setAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Limpia estado de sesión sin afectar localStorage (usado en login también). */
function clearSessionState() {
  // Nada que limpiar por ahora; existe para consistencia.
}
