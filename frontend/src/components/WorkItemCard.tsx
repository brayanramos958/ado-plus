import { useState } from 'react'
import { Avatar } from './Avatar'
import { TypeBadge, StateBadge } from './Badge'
import { TimeConfirmDialog } from './TimeConfirmDialog'
import { useUpdateWorkItem } from '../hooks/useWorkItems'
import { useBoardStore } from '../store/boardStore'
import { TASK_STATES, BUG_STATES, PRIORITY_COLORS, PRIORITY_LABELS, type WorkItemUI, type WorkItemState } from '../types'
import { ChevronLeft, ChevronRight, Loader2, Clock, Pencil } from 'lucide-react'

interface WorkItemCardProps {
  workItem: WorkItemUI
  onClick?: () => void
  draggable?: boolean
}

export function WorkItemCard({ workItem, onClick, draggable }: WorkItemCardProps) {
  const assigneeName = workItem.assignedToName ?? workItem.assignedTo ?? 'Sin asignar'
  const updateMutation = useUpdateWorkItem()
  const { setEditingWorkItemId } = useBoardStore()
  const [isDragging, setIsDragging] = useState(false)
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
    if (newState === 'Resuelto') {
      patches.push({ op: 'add', path: '/fields/Custom.FechaFin', value: now })
    }

    // Intercept: moving FROM "En proceso" → show time confirmation dialog
    if (workItem.state === 'En proceso' && CONFIRM_STATES.includes(newState)) {
      setPendingChange({ newState, basePatches: patches })
      return
    }

    // Auto-register CompletedWork when going to Resuelto without dialog
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

  return (
    <>
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.setData('text/plain', String(workItem.id))
        e.dataTransfer.effectAllowed = 'move'
        // Defer opacity so browser captures ghost BEFORE re-render
        setTimeout(() => setIsDragging(true), 0)
      } : undefined}
      onDragEnd={draggable ? () => setIsDragging(false) : undefined}
      className={`bg-card rounded-lg border border-border p-3 transition-all
        hover:border-primary/50 hover:shadow-sm
        ${draggable ? 'cursor-grab' : 'cursor-pointer'}
        ${isDragging ? 'opacity-40 scale-[0.97]' : ''}`}
    >
      {/* Header: ID + acciones + Tipo */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {workItem.priority != null && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: PRIORITY_COLORS[workItem.priority] }}
              title={`Prioridad ${workItem.priority} — ${PRIORITY_LABELS[workItem.priority]}`}
            />
          )}
          <span className="text-xs font-mono text-muted-foreground">#{workItem.id}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingWorkItemId(workItem.id) }}
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
            title="Edición rápida"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {workItem.effortPoints != null && (
            <span
              className="flex items-center gap-0.5 text-[10px] font-semibold text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded"
              title="Puntos de esfuerzo (horas)"
            >
              <Clock className="w-2.5 h-2.5" />
              {workItem.effortPoints}h
            </span>
          )}
          <TypeBadge type={workItem.type} />
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {workItem.title}
      </h4>

      {/* Tags (sin assignee tags) */}
      {workItem.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {workItem.tags
            .filter((t) => !t.startsWith('assignee:'))
            .slice(0, 3)
            .map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded"
              >
                {tag}
              </span>
            ))}
        </div>
      )}

      {/* Footer: Avatar + State controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Avatar name={assigneeName} />
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {assigneeName}
          </span>
        </div>

        {/* State change: ← estado → */}
        <div className="flex items-center gap-0.5">
          {updateMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mx-1" />
          ) : (
            <>
              <button
                onClick={(e) => prevState && handleStateChange(e, prevState)}
                disabled={!prevState}
                title={prevState ?? undefined}
                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <StateBadge state={workItem.state} />
              <button
                onClick={(e) => nextState && handleStateChange(e, nextState)}
                disabled={!nextState}
                title={nextState ?? undefined}
                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-0 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fechas y progreso */}
      {(workItem.fechaInicio || workItem.fechaFin || workItem.completedWork != null) && (
        <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground border-t border-border pt-1.5">
          {workItem.fechaInicio && (
            <span>▶ {new Date(workItem.fechaInicio).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
          )}
          {workItem.fechaFin && (
            <span>■ {new Date(workItem.fechaFin).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
          )}
          {workItem.completedWork != null && (
            <span className="text-primary font-semibold">{workItem.completedWork}h registradas</span>
          )}
        </div>
      )}
    </div>

    {pendingChange && (
      <TimeConfirmDialog
        isOpen={true}
        taskTitle={workItem.title}
        estimatedHours={workItem.effortPoints}
        newState={pendingChange.newState}
        onConfirm={handleConfirmTime}
        onSkip={handleSkipTime}
      />
    )}
    </>
  )
}
