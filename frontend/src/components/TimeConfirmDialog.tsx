import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle2, X } from 'lucide-react'
import { TASK_STATE_COLORS, type WorkItemState } from '../types'

interface TimeConfirmDialogProps {
  isOpen: boolean
  taskTitle: string
  estimatedHours: number | undefined
  newState: WorkItemState
  onConfirm: (hours: number) => void
  onSkip: () => void
  onCancel: () => void
}

export function TimeConfirmDialog({
  isOpen,
  taskTitle,
  estimatedHours,
  newState,
  onConfirm,
  onSkip,
  onCancel,
}: TimeConfirmDialogProps) {
  const [hours, setHours] = useState<string>(String(estimatedHours ?? 0))

  useEffect(() => {
    if (isOpen) setHours(String(estimatedHours ?? 0))
  }, [isOpen, estimatedHours])

  const handleConfirm = () => {
    const parsed = parseFloat(hours)
    onConfirm(isNaN(parsed) ? 0 : parsed)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm w-[95vw] p-0 rounded-2xl overflow-hidden border-none shadow-2xl gap-0"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-black text-white leading-tight">
              ¿En esta tarea sí te demoraste?
            </DialogTitle>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold mt-0.5">
              Registro de horas reales
            </p>
          </div>
          {/* Cancel — cierra el modal SIN actualizar nada */}
          <button
            type="button"
            onClick={onCancel}
            title="Cancelar — la tarea NO cambia de estado"
            className="group flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/25 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-white/70 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 bg-background">
          {/* Task title + new state */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground/80 line-clamp-2 leading-snug">
              {taskTitle}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Moviendo a</span>
              <span
                className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-wider"
                style={{ backgroundColor: TASK_STATE_COLORS[newState] }}
              >
                {newState}
              </span>
            </div>
          </div>

          {/* Hours input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Horas reales trabajadas
              </label>
              {estimatedHours != null && (
                <button
                  type="button"
                  onClick={() => setHours(String(estimatedHours))}
                  className="text-[10px] text-primary/70 hover:text-primary font-bold transition-colors"
                >
                  Estimado: {estimatedHours}h
                </button>
              )}
            </div>
            <div className="flex items-center bg-muted/10 border-2 border-muted-foreground/10 rounded-xl px-4 py-3 gap-3 focus-within:border-primary/30 transition-colors">
              <Clock className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
              <input
                type="number"
                min="0"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="flex-1 bg-transparent text-2xl font-black outline-none text-foreground w-0"
                autoFocus
              />
              <span className="text-sm text-muted-foreground font-bold flex-shrink-0">horas</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium underline-offset-2 hover:underline"
          >
            Omitir registro
          </button>
          <Button
            onClick={handleConfirm}
            className="h-10 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
