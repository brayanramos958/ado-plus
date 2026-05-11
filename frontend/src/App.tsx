import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useTheme } from './context/ThemeContext'
import { SprintPage } from './pages/SprintPage'
import './index.css'

function App() {
  const { theme } = useTheme()
  return (
    <TooltipProvider>
      <SprintPage />
      <Toaster richColors theme={theme} position="top-center" closeButton />
    </TooltipProvider>
  )
}

export default App