import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PATError } from './api/client'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Si el PAT está roto, no sigas golpeando ADO — va a fallar siempre igual
        if (error instanceof PATError) return false
        return failureCount < 1
      },
      // No refrescar al enfocar la ventana — el refetchInterval de 30s en el board ya mantiene los datos frescos.
      // Si el PAT es inválido, esto evita que cada focus de ventana dispare 4+ toasts nuevos.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
