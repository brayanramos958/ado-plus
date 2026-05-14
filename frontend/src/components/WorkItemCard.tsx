import { useRef, useState, memo } from 'react'
import { Avatar } from './Avatar'
import { TypeBadge, StateBadge } from './Badge'
import { TimeConfirmDialog } from './TimeConfirmDialog'
import { useUpdateWorkItem } from '../hooks/useWorkItems'
import { useBoardStore } from '../store/boardStore'
import { TASK_STATES, BUG_STATES, PRIORITY_COLORS, PRIORITY_LABELS, type WorkItemUI, type WorkItemState } from '../types'
import { ChevronLeft, ChevronRight, Loader2, Clock, Pencil, GripVertical } from 'lucide-react'

interface WorkItemCardProps {
  workItem: WorkItemUI
  onClick?: (id: number) => void
  draggable?: boolean
}

const WorkItemCardComponent = ({ workItem, onClick, draggable }: WorkItemCardProps) => {
  const assigneeName = workItem.assignedToName ?? workItem.assignedTo ?? 'Sin asignar'
  const updateMutation = useUpdateWorkItem()
  const { setEditingWorkItemId } = useBoardStore()
  const [isDragging, setIsDragging] = useState(false)
  const isDragHandleActive = useRef(false)
  const [pendingChange, setPendingChange] = useState<{
    newState: WorkItemState
    basePatches: Array<{ op: 'add' | 'replace'; path: string; value: string | number }>
  } | null>(null)

  const states = workItem.type === 'Bug' ? BUG_STATES : TASK_STATES
  const currentIndex = states.indexOf(workItem.state as WorkItemState)
  const prevState = currentIndex > 0 ? states[currentIndex - 1] : null
  const nextState = currentIndex < states.length - 1 ? states[currentIndex + 1] : null

  const CONFIRM_STATES: WorkItemState[] = ['Bloqueado', 'Resuelto', 'Cerrado']

  const handleStateChange = (e: React.MouseEvent, newState: WorkItemState) => {
    e.stopPropagation()
    triggerStateChange(newState)
  }

  const triggerStateChange = (newState: WorkItemState) => {
    const patches: Array<{ op: 'add' | 'replace'; path: string; value: string | number }> = [
      { op: 'add', path: '/fields/System.State', value: newState },
    ]
    const now = new Date().toISOString()

    if (newState === 'En proceso' && !workItem.fechaInicio) {
      patches.push({ op: 'add', path: '/fields/Custom.FechaInicio', value: now })
    }
    if (newState === 'Resuelto' && !workItem.fechaFin) {
      patches.push({ op: 'add', path: '/fields/Custom.FechaFin', value: now })
    }

    if (workItem.state === 'En proceso' && CONFIRM_STATES.includes(newState)) {
      setPendingChange({ newState, basePatches: patches })
      return
    }

    if (newState === 'Resuelto' && workItem.effortPoints != null) {
      patches.push({
        op: 'add',
        path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
        value: (workItem.completedWork ?? 0) + workItem.effortPoints,
      })
    }

    updateMutation.mutate({ id: workItem.id, patches })
  }

  const handleConfirmTime = (hours: number) => {
    if (!pendingChange) return
    updateMutation.mutate({
      id: workItem.id,
      patches: [
        ...pendingChange.basePatches,
        { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: hours },
      ],
    })
    setPendingChange(null)
  }

  const handleSkipTime = () => {
    if (!pendingChange) return
    updateMutation.mutate({ id: workItem.id, patches: pendingChange.basePatches })
    setPendingChange(null)
  }

  const shortName = assigneeName.split(' ')[0]

  return (
    <>
    <div
      onClick={() => onClick?.(workItem.id)}
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        if (!isDragHandleActive.current) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData('text/plain', String(workItem.id))
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => setIsDragging(true), 0)
      } : undefined}
      onDragEnd={draggable ? () => {
        setIsDragging(false)
        isDragHandleActive.current = false
      } : undefined}
      className={`bg-card rounded-lg border border-border transition-all select-none cursor-pointer
        hover:border-primary/50 hover:shadow-sm
        ${isDragging ? 'opacity-40 scale-[0.97]' : ''}`}
    >
      <div className="p-2">
        {/* Header — zona de drag completa (excepto el botón de editar) */}
        <div
          className={`flex items-center justify-between mb-1.5 gap-1 min-w-0 rounded-md -mx-1 px-1 py-0.5
            ${draggable ? 'cursor-grab hover:bg-muted/40 transition-colors' : ''}`}
          onMouseDown={draggable ? () => { isDragHandleActive.current = true } : undefined}
          onMouseUp={draggable ? () => { isDragHandleActive.current = false } : undefined}
        >
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {draggable && (
              <GripVertical className="w-3 h-3 flex-shrink-0 text-muted-foreground/30" />
            )}
            {workItem.priority != null && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[workItem.priority] }}
                title={`Prioridad ${workItem.priority} — ${PRIORITY_LABELS[workItem.priority]}`}
              />
            )}
            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
              #{workItem.id}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Edit — frena mousedown para no activar drag al hacer click aquí */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setEditingWorkItemId(workItem.id) }}
              className="flex items-center justify-center w-5 h-5 rounded-md border border-border/60
                         text-muted-foreground hover:text-primary hover:bg-primary/10
                         hover:border-primary/30 transition-all cursor-pointer"
              title="Edición rápida"
            >
              <Pencil className="w-3 h-3" />
            </button>

            {workItem.effortPoints != null && (
              <span
                className="flex items-center gap-0.5 text-[9px] font-semibold text-primary/80 bg-primary/8 px-1 py-0.5 rounded flex-shrink-0"
                title="Puntos de esfuerzo (horas)"
              >
                <Clock className="w-2 h-2" />
                {workItem.effortPoints}h
              </span>
            )}
            <TypeBadge type={workItem.type} />
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-medium text-foreground line-clamp-2 mb-1.5 leading-snug">
          {workItem.title}
        </h4>

        {/* Tags — max 2, truncated */}
        {workItem.tags.filter((t) => !t.startsWith('assignee:')).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {workItem.tags
              .filter((t) => !t.startsWith('assignee:'))
              .slice(0, 2)
              .map((tag) => (
                <span
                  key={tag}
                  className="px-1 py-0.5 text-[9px] bg-secondary text-secondary-foreground rounded truncate max-w-[60px]"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
          </div>
        )}

        {/* Footer: avatar + nombre | flechas de estado */}
        <div className="flex items-center justify-between pt-1.5 border-t border-border gap-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0 flex-shrink overflow-hidden">
            <Avatar name={assigneeName} size="sm" />
            <span className="text-[10px] text-muted-foreground truncate">{shortName}</span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {updateMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mx-0.5" />
            ) : (
              <>
                <button
                  onClick={(e) => prevState && handleStateChange(e, prevState)}
                  disabled={!prevState}
                  title={prevState ?? undefined}
                  className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <StateBadge state={workItem.state} />
                <button
                  onClick={(e) => nextState && handleStateChange(e, nextState)}
                  disabled={!nextState}
                  title={nextState ?? undefined}
                  className="w-4 h-4 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-0 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Fechas y progreso */}
        {(workItem.fechaInicio || workItem.fechaFin || workItem.completedWork != null) && (
          <div className="mt-1 flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[9px] text-muted-foreground border-t border-border pt-1">
            {workItem.fechaInicio && (
              <span className="flex-shrink-0">▶ {fmtDateLocal(workItem.fechaInicio, { day: '2-digit', month: 'short' })}</span>
            )}
            {workItem.fechaFin && (
              <span className="flex-shrink-0">■ {fmtDateLocal(workItem.fechaFin, { day: '2-digit', month: 'short' })}</span>
            )}
            {workItem.completedWork != null && (
              <span className="text-primary font-semibold flex-shrink-0">{workItem.completedWork}h</span>
            )}
          </div>
        )}
      </div>
    </div>

    {pendingChange && (
      <TimeConfirmDialog
        isOpen={true}
        taskTitle={workItem.title}
        estimatedHours={workItem.effortPoints}
        newState={pendingChange.newState}
        onConfirm={handleConfirmTime}
        onSkip={handleSkipTime}
        onCancel={() => setPendingChange(null)}
      />
    )}
    </>
  )
}

export const WorkItemCard = memo(WorkItemCardComponent)

/**
 * Convierte fecha ISO a local sin el bug de new Date("YYYY-MM-DD") = UTC midnight.
 * En UTC-5, new Date("2024-05-10") → 2024-05-10T00:00:00Z → toLocaleDateString muestra 9 de mayo.
 * Esta función extrae [y, m, d] y construye new Date(y, m-1, d) → se interpreta en hora local.
 */
const fmtDateLocal = (iso: string, options: Intl.DateTimeFormatOptions): string => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', options)
}
