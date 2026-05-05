interface BadgeProps {
  text: string
  color?: string
  variant?: 'solid' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ text, color = 'bg-secondary text-secondary-foreground', variant = 'solid', size = 'sm', className = '' }: BadgeProps) {
  const variantClasses = {
    solid: color,
    outline: `border ${color} bg-transparent`,
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {text}
    </span>
  )
}

export function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Task: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    Bug: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    Epic: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    Feature: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    Issue: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  }

  return <Badge text={type} color={colors[type] || 'bg-secondary text-secondary-foreground'} />
}

export function StateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    'Por Hacer': 'bg-secondary text-secondary-foreground',
    'Planeado': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'En proceso': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Bloqueado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'Resuelto': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Cerrado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    // Bug states
    New: 'bg-secondary text-secondary-foreground',
    Active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Resolved: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    Closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  }

  return <Badge text={state} color={colors[state] || 'bg-secondary text-secondary-foreground'} />
}