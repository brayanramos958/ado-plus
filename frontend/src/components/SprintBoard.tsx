// SprintBoard — vista del sprint por usuario (swimlanes)
// Filas horizontales = usuarios
// Columnas = estados (Por Hacer, Planeado, En proceso, Bloqueado, Resuelto, Cerrado)

import { useBoardStore } from '../store/boardStore'
import { useSprintWorkItems } from '../hooks/useWorkItems'
import { WorkItemCard } from './WorkItemCard'
import { UserCollapseList } from './UserCollapseList'
import { Spinner } from './Spinner'
import { TASK_STATES, TASK_STATE_COLORS, type WorkItemUI } from '../types'

interface SprintBoardProps {
  sprintPath: string
  onWorkItemClick?: (id: number) => void
}

export function SprintBoard({ sprintPath, onWorkItemClick }: SprintBoardProps) {
  const { filterType, filterAssigned, searchQuery, viewMode } = useBoardStore()
  const { data: workItems, isLoading, error } = useSprintWorkItems(sprintPath)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400">Error al cargar las tareas</p>
        <p className="text-sm text-gray-400 dark:text-dark-500 mt-1">{String(error)}</p>
      </div>
    )
  }

  // Apply filters
  let filteredItems = workItems || []

  if (filterType) {
    filteredItems = filteredItems.filter((w) => w.type === filterType)
  }

  if (filterAssigned === 'unassigned') {
    filteredItems = filteredItems.filter((w) => !w.assignedTo)
  } else if (filterAssigned) {
    filteredItems = filteredItems.filter(
      (w) => w.assignedTo?.toLowerCase() === filterAssigned.toLowerCase()
    )
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredItems = filteredItems.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        String(w.id).includes(query)
    )
  }

  // Render based on view mode
  if (viewMode === 'list') {
    return (
      <div className="p-2">
        <UserCollapseList
          workItems={filteredItems}
          onWorkItemClick={onWorkItemClick}
        />
      </div>
    )
  }

  // Default: board view (swimlanes)
  // If no specific user filter is applied, show user cards selection
  if (!filterAssigned) {
    return (
      <div className="h-full w-full overflow-auto bg-slate-50/50 dark:bg-transparent">
        <UserSelectionGrid
          workItems={workItems || []}
          onSelectUser={(email) => useBoardStore.getState().setFilterAssigned(email)}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto flex flex-col">
      {/* Botón Volver - Solo aparece si hay un usuario filtrado */}
      {filterAssigned && (
        <div className="p-3 bg-background border-b border-border flex items-center">
          <button
            onClick={() => useBoardStore.getState().setFilterAssigned(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al equipo
          </button>
          <div className="ml-4 h-4 w-[1px] bg-border"></div>
          <span className="ml-4 text-sm font-semibold text-foreground capitalize">
            Tablero de {filterAssigned === 'unassigned' ? 'Sin asignar' : filteredItems[0]?.assignedToName || filterAssigned.split('@')[0]}
          </span>
        </div>
      )}

      <SprintBoardTable
        workItems={filteredItems}
        onWorkItemClick={onWorkItemClick}
      />
    </div>
  )
}

// ============================================
// UserSelectionGrid — Grid de tarjetas de usuario
// ============================================

interface UserSelectionGridProps {
  workItems: WorkItemUI[]
  onSelectUser: (email: string | null) => void
}

function UserSelectionGrid({ workItems, onSelectUser }: UserSelectionGridProps) {
  // Get unique assignees and their counts
  const userStats = new Map<string, { email: string; name: string; counts: Record<string, number>; total: number }>()

  for (const item of workItems) {
    const email = item.assignedTo || 'unassigned'
    const name = item.assignedToName || (item.assignedTo ? item.assignedTo.split('@')[0] : 'Sin asignar')

    if (!userStats.has(email)) {
      userStats.set(email, {
        email: item.assignedTo || '',
        name,
        counts: {},
        total: 0
      })
    }

    const stats = userStats.get(email)!
    stats.counts[item.state] = (stats.counts[item.state] || 0) + 1
    stats.total++
  }

  const userList = Array.from(userStats.values()).sort((a, b) => {
    if (!a.email) return 1
    if (!b.email) return -1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Equipo del Sprint</h2>
        <p className="text-sm text-muted-foreground">Selecciona un integrante para ver su tablero detallado</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {userList.map((user) => (
          <button
            key={user.email || 'unassigned'}
            onClick={() => onSelectUser(user.email || 'unassigned')}
            className="flex flex-col p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-md transition-all text-left group"
          >
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold
                ${user.email ? 'bg-primary' : 'bg-muted-foreground'}`}
              >
                {user.email ? getInitials(user.name) : '?'}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {user.name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{user.email || 'Sin asignar'}</p>
              </div>
            </div>

            {/* Counts Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {TASK_STATES.slice(0, 6).map((state) => (
                <div key={state} className="flex flex-col items-center p-2 rounded-lg bg-muted/50 min-w-0">
                  <span className="text-[9px] font-bold uppercase opacity-60 truncate w-full text-center" style={{ color: TASK_STATE_COLORS[state] }} title={state}>
                    {state}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {user.counts[state] || 0}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="mt-auto pt-3 border-t border-border/50 flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">Total tareas</span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                {user.total}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================
// SprintBoardTable — tabla por usuario
// ============================================

interface SprintBoardTableProps {
  workItems: WorkItemUI[]
  onWorkItemClick?: (id: number) => void
}

function SprintBoardTable({ workItems, onWorkItemClick }: SprintBoardTableProps) {
  // Get unique assignees from work items
  const assignees = new Map<string, { email: string; name: string }>()

  for (const item of workItems) {
    if (item.assignedTo) {
      const name = item.assignedToName ?? item.assignedTo.split('@')[0]
      assignees.set(item.assignedTo, { email: item.assignedTo, name })
    }
  }

  // Add "unassigned" if there are unassigned items
  const hasUnassigned = workItems.some((w) => !w.assignedTo)
  if (hasUnassigned) {
    assignees.set('unassigned', { email: '', name: 'Sin asignar' })
  }

  const assigneeList = Array.from(assignees.values())

  return (
    <div className="min-w-full min-h-full">
      {/* Header de estados - STICKY siempre visible */}
      <div className="flex sticky top-0 z-50 bg-background border-b border-border shadow-sm">
        {/* Columna Usuario - sticky left */}
        <div className="sticky left-0 z-50 w-48 flex-shrink-0 p-3 bg-background border-r border-border">
          <span className="text-xs font-semibold text-foreground uppercase">Usuario</span>
        </div>
        {/* Columnas de estados */}
        {TASK_STATES.map((state) => (
          <div
            key={state}
            className="flex-1 min-w-[160px] p-3 text-center"
          >
            <span
              className="text-xs font-semibold uppercase"
              style={{ color: TASK_STATE_COLORS[state] }}
            >
              {state}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">
              ({getCountByState(workItems, state)})
            </span>
          </div>
        ))}
        <div className="w-20 flex-shrink-0 p-3 text-center">
          <span className="text-xs font-semibold text-foreground uppercase">Total</span>
        </div>
      </div>

      {/* Contenido - scrollable */}
      <div className="relative">
        {/* Filas de usuarios */}
        {assigneeList.map((assignee) => (
          <div
            key={assignee.email || 'unassigned'}
            className="flex border-b border-border/50 hover:bg-muted/30"
          >
            {/* Usuario - sticky left */}
            <div className="sticky left-0 z-20 w-48 flex-shrink-0 p-3 flex items-center gap-2 bg-background border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0
                  ${assignee.email ? 'bg-primary' : 'bg-muted-foreground'}`}
              >
                {assignee.email ? getInitials(assignee.name) : '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {assignee.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{assignee.email || 'Sin asignar'}</p>
              </div>
            </div>

            {/* Columnas de estado - contenido scrollable */}
            {TASK_STATES.map((state) => {
              const items = workItems.filter(
                (w) => (w.assignedTo || null) === (assignee.email || null) && w.state === state
              )

              return (
                <div
                  key={state}
                  className="flex-1 min-w-[160px] p-2 border-l border-border/50"
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <WorkItemCard
                        key={item.id}
                        workItem={item}
                        onClick={() => onWorkItemClick?.(item.id)}
                      />
                    ))}
                    {items.length === 0 && (
                      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground/30">
                        —
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Total */}
            <div className="w-20 flex-shrink-0 p-3 flex items-center justify-center bg-muted/30">
              <span className="text-sm font-semibold text-foreground">
                {workItems.filter(
                  (w) => (w.assignedTo || null) === (assignee.email || null)
                ).length}
              </span>
            </div>
          </div>
        ))}

        {/* Resumen total - sticky bottom */}
        <div className="flex sticky bottom-0 z-40 bg-muted/95 backdrop-blur-sm border-t-2 border-border">
          <div className="sticky left-0 z-50 w-48 flex-shrink-0 p-3 bg-muted border-r border-border font-bold">
            <span className="text-sm text-foreground uppercase">TOTAL</span>
          </div>
          {TASK_STATES.map((state) => {
            const count = getCountByState(workItems, state)
            return (
              <div key={state} className="flex-1 min-w-[160px] p-3 text-center">
                <span className="text-sm font-semibold text-foreground">{count}</span>
              </div>
            )
          })}
          <div className="w-20 flex-shrink-0 p-3 flex items-center justify-center">
            <span className="text-sm font-bold text-foreground">{workItems.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Utilities
// ============================================

function getCountByState(workItems: WorkItemUI[], state: string): number {
  return workItems.filter((w) => w.state === state).length
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}