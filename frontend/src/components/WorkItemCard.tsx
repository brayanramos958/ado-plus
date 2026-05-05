import { useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { TypeBadge, StateBadge } from './Badge'
import { TimeConfirmDialog } from './TimeConfirmDialog'
import { useUpdateWorkItem } from '../hooks/useWorkItems'
import { useBoardStore } from '../store/boardStore'
import { TASK_STATES, BUG_STATES, PRIORITY_COLORS, PRIORITY_LABELS, type WorkItemUI, type WorkItemState } from '../types'
import { ChevronLeft, ChevronRight, Loader2, Clock, Pencil, GripHorizontal } from 'lucide-react'

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
    if (newState === 'Resuelto') {
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

  // Show only first name to save horizontal space in narrow columns
  const shortName = assigneeName.split(' ')[0]

  return (
    <>
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        // Only allow drag when the dedicated handle was pressed
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
      {/* Card body */}
      <div className="p-2.5">

        {/* Header: prioridad + ID + edit | effort + type */}
        <div className="flex items-center justify-between mb-2 gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
            {workItem.priority != null && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[workItem.priority] }}
                title={`Prioridad ${workItem.priority} — ${PRIORITY_LABELS[workItem.priority]}`}
              />
            )}
            <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
              #{workItem.id}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Edit button — visible border, bigger touch target */}
            <button
              onClick={(e) => { e.stopPropagation(); setEditingWorkItemId(workItem.id) }}
              className="flex items-center justify-center w-6 h-6 rounded-md border border-border/60 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all"
              title="Edición rápida"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {workItem.effortPoints != null && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-semibold text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded flex-shrink-0"
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
        <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2 leading-snug">
          {workItem.title}
        </h4>

        {/* Tags — max 2, truncated */}
        {workItem.tags.filter((t) => !t.startsWith('assignee:')).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {workItem.tags
              .filter((t) => !t.startsWith('assignee:'))
              .slice(0, 2)
              .map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded truncate max-w-[70px]"
                  title={tag}
                >
                  {tag}
                </span>
              ))}
          </div>
        )}

        {/* Footer: avatar + nombre | flechas de estado */}
        <div className="flex items-center justify-between pt-2 border-t border-border gap-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-shrink overflow-hidden">
            <Avatar name={assigneeName} />
            <span className="text-xs text-muted-foreground truncate">{shortName}</span>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
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
          <div className="mt-1.5 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground border-t border-border pt-1.5">
            {workItem.fechaInicio && (
              <span className="flex-shrink-0">▶ {new Date(workItem.fechaInicio).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
            )}
            {workItem.fechaFin && (
              <span className="flex-shrink-0">■ {new Date(workItem.fechaFin).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
            )}
            {workItem.completedWork != null && (
              <span className="text-primary font-semibold flex-shrink-0">{workItem.completedWork}h</span>
            )}
          </div>
        )}
      </div>

      {/* Drag handle — franja exclusiva al fondo de la card */}
      {draggable && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation()
            isDragHandleActive.current = true
          }}
          onMouseUp={() => { isDragHandleActive.current = false }}
          className="border-t border-dashed border-border/50 px-3 py-1 rounded-b-lg
                     flex items-center justify-center
                     text-muted-foreground/30 hover:text-muted-foreground/60
                     hover:bg-muted/40 transition-colors cursor-grab"
          title="Arrastrar para cambiar estado"
        >
          <GripHorizontal className="w-3.5 h-3.5" />
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
