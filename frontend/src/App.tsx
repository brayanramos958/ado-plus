import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { SprintPage } from './pages/SprintPage'
import './index.css'

function App() {
  return (
    <TooltipProvider>
      <SprintPage />
      <Toaster richColors position="bottom-right" />
    </TooltipProvider>
  )
}

export default App