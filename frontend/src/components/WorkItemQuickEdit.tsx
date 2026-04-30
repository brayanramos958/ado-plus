import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Clock, Calendar, CheckSquare, AlertCircle } from 'lucide-react'
import { useUpdateWorkItem } from '../hooks/useWorkItems'
import { TASK_STATES, BUG_STATES, PRIORITY_COLORS, PRIORITY_LABELS, type WorkItemUI } from '../types'

interface WorkItemQuickEditProps {
  workItem: WorkItemUI | null
  isOpen: boolean
  onClose: () => void
}

// ISO UTC → valor para input datetime-local (hora local)
function toLocalInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

// Valor de datetime-local → ISO UTC
function toISO(local: string): string {
  if (!local) return ''
  return new Date(local).toISOString()
}

export function WorkItemQuickEdit({ workItem, isOpen, onClose }: WorkItemQuickEditProps) {
  const [state, setState] = useState<string>('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [effortPoints, setEffortPoints] = useState('')
  const [completedWork, setCompletedWork] = useState('')
  const [priority, setPriority] = useState<number | null>(null)

  const updateMutation = useUpdateWorkItem()

  // Inicializar con valores actuales del work item
  useEffect(() => {
    if (isOpen && workItem) {
      setState(workItem.state)
      setFechaInicio(toLocalInput(workItem.fechaInicio))
      setFechaFin(toLocalInput(workItem.fechaFin))
      setEffortPoints(workItem.effortPoints != null ? String(workItem.effortPoints) : '')
      setCompletedWork(workItem.completedWork != null ? String(workItem.completedWork) : '')
      setPriority(workItem.priority ?? null)
    }
  }, [isOpen, workItem])

  if (!workItem) return null

  const states = workItem.type === 'Bug' ? BUG_STATES : TASK_STATES

  const effortFieldToWrite = workItem.effortField ?? 'Microsoft.VSTS.Scheduling.Effort'

  const handleSave = async () => {
    const patches: Array<{ op: 'add'; path: string; value: string | number }> = []

    if (state !== workItem.state) {
      patches.push({ op: 'add', path: '/fields/System.State', value: state })
    }

    const newFechaInicio = fechaInicio ? toISO(fechaInicio) : ''
    const prevFechaInicio = workItem.fechaInicio ?? ''
    if (newFechaInicio !== prevFechaInicio) {
      patches.push({ op: 'add', path: '/fields/Custom.FechaInicio', value: newFechaInicio })
    }

    const newFechaFin = fechaFin ? toISO(fechaFin) : ''
    const prevFechaFin = workItem.fechaFin ?? ''
    if (newFechaFin !== prevFechaFin) {
      patches.push({ op: 'add', path: '/fields/Custom.FechaFin', value: newFechaFin })
    }

    const newEffort = effortPoints !== '' ? Number(effortPoints) : null
    if (newEffort !== null && newEffort !== (workItem.effortPoints ?? null)) {
      patches.push({ op: 'add', path: `/fields/${effortFieldToWrite}`, value: newEffort })
    }

    const newCompleted = completedWork !== '' ? Number(completedWork) : null
    if (newCompleted !== null && newCompleted !== (workItem.completedWork ?? null)) {
      patches.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: newCompleted })
    }

    if (priority !== null && priority !== (workItem.priority ?? null)) {
      patches.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: priority })
    }

    if (patches.length === 0) {
      onClose()
      return
    }

    await updateMutation.mutateAsync({ id: workItem.id, patches })
    onClose()
  }

  const stateColor: Record<string, string> = {
    'Por Hacer': 'text-gray-400',
    'Planeado': 'text-yellow-500',
    'En proceso': 'text-blue-500',
    'Bloqueado': 'text-red-500',
    'Resuelto': 'text-orange-500',
    'Cerrado': 'text-green-500',
    'New': 'text-gray-400',
    'Active': 'text-blue-500',
    'Resolved': 'text-orange-500',
    'Closed': 'text-green-500',
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm w-[95vw] gap-0 p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-2">
            <CheckSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                #{workItem.id} · Edición rápida
              </p>
              <DialogTitle className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {workItem.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4">

          {/* Estado */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Estado
            </label>
            <Select value={state} onValueChange={(v) => v && setState(v)}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className={`font-medium ${stateColor[s] ?? ''}`}>{s}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Inicio
              </label>
              <Input
                type="datetime-local"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="h-9 text-xs px-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fin
              </label>
              <Input
                type="datetime-local"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="h-9 text-xs px-2"
              />
            </div>
          </div>

          {/* Prioridad */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Prioridad
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`h-9 rounded-lg text-[10px] font-black transition-all border-2 flex flex-col items-center justify-center gap-0.5
                    ${priority === p ? 'text-white border-transparent shadow-sm' : 'bg-background text-muted-foreground border-muted-foreground/10 hover:bg-muted/40'}`}
                  style={priority === p ? { backgroundColor: PRIORITY_COLORS[p] } : {}}
                >
                  <span className="font-black">P{p}</span>
                  <span className="text-[8px] opacity-80 leading-none">{PRIORITY_LABELS[p]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Estimado (h)
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={effortPoints}
                onChange={(e) => setEffortPoints(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Registrado (h)
              </label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={completedWork}
                onChange={(e) => setCompletedWork(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>

          {/* Resumen de cambio si se modifica el estado */}
          {state !== workItem.state && (
            <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <span className={`font-medium ${stateColor[workItem.state] ?? 'text-muted-foreground'}`}>
                {workItem.state}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className={`font-medium ${stateColor[state] ?? 'text-muted-foreground'}`}>
                {state}
              </span>
            </div>
          )}

          {/* Error */}
          {updateMutation.isError && (
            <div className="px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'Error al guardar'}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-3 gap-2 border-t border-border bg-muted/30 flex-row justify-end -mx-0 -mb-0 rounded-b-xl">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
