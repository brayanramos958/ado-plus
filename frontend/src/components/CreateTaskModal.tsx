import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Target, Box, X } from 'lucide-react'
import { useEpics, useFeaturesByEpic, useMembers, useIterations, useCreateWorkItem } from '../hooks/useWorkItems'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  defaultSprintPath?: string | null
}

export function CreateTaskModal({ isOpen, onClose, defaultSprintPath }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'Task' | 'Bug'>('Task')
  const [epicId, setEpicId] = useState<number | null>(null)
  const [featureId, setFeatureId] = useState<number | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [sprintPath, setSprintPath] = useState(defaultSprintPath || '')

  const { data: epics, isLoading: loadingEpics } = useEpics()
  const { data: features, isLoading: loadingFeatures } = useFeaturesByEpic(epicId)
  const { data: members } = useMembers()
  const { data: iterations } = useIterations()
  const createMutation = useCreateWorkItem()

  useEffect(() => {
    if (isOpen) {
      setSprintPath(defaultSprintPath || '')
      setTitle('')
      setType('Task')
      setEpicId(null)
      setFeatureId(null)
      setAssignedTo(null)
    }
  }, [isOpen, defaultSprintPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await createMutation.mutateAsync({
      type,
      title: title.trim(),
      state: type === 'Task' ? 'Por Hacer' : 'New',
      assignedTo: assignedTo || undefined,
      iterationPath: sprintPath || undefined,
      parentId: featureId ?? epicId ?? undefined,
    })

    onClose()
  }

  const handleEpicChange = (v: string | null) => {
    setEpicId(v ? Number(v) : null)
    setFeatureId(null)
  }

  const parentLabel = featureId
    ? features?.value.find((f) => f.id === featureId)?.title
    : epicId
    ? epics?.value.find((e) => e.id === epicId)?.title
    : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-lg w-[95vw] p-0 gap-0 overflow-hidden">

        {/* Header */}
        <div className="bg-primary px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-semibold text-primary-foreground leading-none">
              Nueva Tarea
            </DialogTitle>
            {parentLabel && (
              <p className="text-xs text-primary-foreground/70 truncate mt-0.5">{parentLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Tipo
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('Task')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    type === 'Task'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Task
                </button>
                <button
                  type="button"
                  onClick={() => setType('Bug')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    type === 'Bug'
                      ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Bug
                </button>
              </div>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Título <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Describe brevemente la tarea..."
                className="h-9"
              />
            </div>

            {/* Épica */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Épica
              </label>
              {loadingEpics ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando épicas...
                </div>
              ) : (
                <Select
                  value={epicId?.toString() ?? ''}
                  onValueChange={handleEpicChange}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Sin épica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin épica</SelectItem>
                    {epics?.value.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id.toString()}>
                        #{epic.id} — {epic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Feature */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Box className="w-3 h-3" /> Feature
                {epicId && (
                  <span className="text-primary font-normal normal-case">(filtrado por épica)</span>
                )}
              </label>
              {loadingFeatures ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-9">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando features...
                </div>
              ) : (
                <Select
                  value={featureId?.toString() ?? ''}
                  onValueChange={(v) => setFeatureId(v ? Number(v) : null)}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Sin feature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin feature</SelectItem>
                    {features?.value.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        #{f.id} — {f.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {featureId && (
                <p className="text-[11px] text-primary font-medium">
                  La tarea quedará bajo esta feature como elemento hijo
                </p>
              )}
            </div>

            {/* Asignado */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Asignado
              </label>
              <Select
                value={assignedTo ?? ''}
                onValueChange={(v) => setAssignedTo(v || null)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {members?.value.map((m) => (
                    <SelectItem key={m.email} value={m.email}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sprint */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Sprint
              </label>
              <Select
                value={sprintPath || ''}
                onValueChange={(v) => setSprintPath(v ?? '')}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Sin sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin sprint</SelectItem>
                  {iterations?.value.map((i) => (
                    <SelectItem key={i.id} value={i.path}>
                      {i.name}{i.attributes.timeFrame === 'current' ? ' (actual)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Error */}
          {createMutation.isError && (
            <div className="mx-5 mb-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Error al crear la tarea'}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3 bg-muted/30">
            <div className="text-[11px] text-muted-foreground">
              {featureId
                ? `Bajo Feature #${featureId}`
                : epicId
                ? `Bajo Épica #${epicId}`
                : 'Sin jerarquía'}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || !title.trim()}
              >
                {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                {createMutation.isPending ? 'Creando...' : 'Crear tarea'}
              </Button>
            </div>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  )
}
