import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SprintPage } from './pages/SprintPage'
import { LoginPage } from './pages/LoginPage'
import './index.css'

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <LoginPage />
  return <SprintPage />
}

function App() {
  const { theme } = useTheme()
  return (
    <TooltipProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
      <Toaster richColors theme={theme} position="top-center" closeButton />
    </TooltipProvider>
  )
}

export default App