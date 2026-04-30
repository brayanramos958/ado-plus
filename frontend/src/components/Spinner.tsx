// Spinner — indicador de carga
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div
      className={`animate-spin rounded-full border-2 border-muted border-t-primary ${sizeClasses[size]} ${className}`}
    />
  )
}

// Loading overlay
export function LoadingOverlay({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

// Page loading state
export function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}