// Avatar component — muestra inicial del usuario
interface AvatarProps {
  name: string
  image?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, image, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name)
  
  // Generate color from name
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  ]
  const colorIndex = name.charCodeAt(0) % colors.length
  const bgColor = colors[colorIndex]

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white ${className} ${bgColor}`}
    >
      {image ? (
        <img
          src={image}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none'
            target.replaceWith(document.createTextNode(initials))
          }}
        />
      ) : (
        initials
      )}
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}