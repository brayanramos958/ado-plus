import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import * as api from '../api/client'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Loader2, Clock, Calendar, AlertCircle, Edit2,
  User, ChevronDown, Search, X, Tag, Layout, MessageSquare, Target, Box,
} from 'lucide-react'
import { useUpdateWorkItem, useMembers, useIterations, useTags, useEpics, useFeaturesByEpic, useWorkItemHierarchy } from '../hooks/useWorkItems'
import { RichTextEditor } from './RichTextEditor'
import {
  TASK_STATES, BUG_STATES, PRIORITY_COLORS, PRIORITY_LABELS,
  TASK_STATE_COLORS, type WorkItemUI,
} from '../types'

// ISO UTC → valor para input date
function toDateInput(iso?: string): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

/**
 * Convierte valor de date input (YYYY-MM-DD) a ISO sin el bug de timezone.
 * new Date("2024-05-10") → 2024-05-10T00:00:00Z → en UTC-5 se muestra el 9 de mayo.
 * Construimos explícitamente new Date(y, m-1, d) para evitar la interpretación UTC midnight.
 */
function toISO(local: string): string {
  if (!local) return ''
  const [y, m, d] = local.split('-').map(Number)
  return new Date(y, m - 1, d).toISOString()
}

interface WorkItemQuickEditProps {
  workItem: WorkItemUI | null
  isOpen: boolean
  onClose: () => void
}

export function WorkItemQuickEdit({ workItem, isOpen, onClose }: WorkItemQuickEditProps) {
  const [title, setTitle] = useState('')
  const [state, setState] = useState<string>('')
  const [assignedTo, setAssignedTo] = useState('')
  const [sprintPath, setSprintPath] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [openCount, setOpenCount] = useState(0)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [effortPoints, setEffortPoints] = useState('')
  const [completedWork, setCompletedWork] = useState('')
  const [priority, setPriority] = useState<number | null>(null)
  const [epicId, setEpicId] = useState<number | null>(null)
  const [epicName, setEpicName] = useState<string | null>(null)
  const [epicSearchOpen, setEpicSearchOpen] = useState(false)
  const [epicSearch, setEpicSearch] = useState('')
  const [featureId, setFeatureId] = useState<number | null>(null)
  const [featureName, setFeatureName] = useState<string | null>(null)
  const [originalFeatureId, setOriginalFeatureId] = useState<number | null>(null)

  const tagDropdownRef = useRef<HTMLDivElement>(null)
  const epicDropdownRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const updateMutation = useUpdateWorkItem()

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  const { data: members } = useMembers()
  const { data: iterations } = useIterations()
  const { data: availableTags, isLoading: loadingTags, isError: tagsError } = useTags()
  const { data: hierarchy } = useWorkItemHierarchy(isOpen ? workItem?.id ?? null : null)
  const { data: epics } = useEpics(epicSearch || undefined)
  const { data: features } = useFeaturesByEpic(epicId)

  const { data: fullItem, isLoading: loadingDescription } = useQuery({
    queryKey: ['workitem-full', workItem?.id],
    queryFn: () => api.getWorkItemDetails(workItem!.id),
    enabled: isOpen && !!workItem,
    staleTime: 5 * 60 * 1000,
  })

  const existingDescription = fullItem?.fields['System.Description'] ?? ''

  useEffect(() => {
    if (isOpen && workItem) {
      setTitle(workItem.title)
      setState(workItem.state)
      setAssignedTo(workItem.assignedTo ?? '')
      setSprintPath(workItem.iterationPath ?? '')
      setTags(workItem.tags ?? [])
      setDescription('')
      setDescriptionTouched(false)
      setFechaInicio(toDateInput(workItem.fechaInicio))
      setFechaFin(toDateInput(workItem.fechaFin))
      setEffortPoints(workItem.effortPoints != null ? String(workItem.effortPoints) : '')
      setCompletedWork(workItem.completedWork != null ? String(workItem.completedWork) : '')
      setPriority(workItem.priority ?? null)
      setTagDropdownOpen(false)
      setTagSearch('')
      setEpicSearchOpen(false)
      setEpicSearch('')
      setOpenCount((c) => c + 1)
      // Reset epic/feature until hierarchy loads
      setEpicId(null)
      setFeatureId(null)
      setOriginalFeatureId(null)
    }
  }, [isOpen, workItem])

  // Initialize epic/feature from hierarchy once it loads
  useEffect(() => {
    if (isOpen && hierarchy) {
      const fid = hierarchy.feature?.id ?? null
      const eid = hierarchy.epic?.id ?? null
      setFeatureId(fid)
      setFeatureName(hierarchy.feature?.fields['System.Title'] ?? null)
      setEpicId(eid)
      setEpicName(hierarchy.epic?.fields['System.Title'] ?? null)
      setOriginalFeatureId(fid)
    }
  }, [isOpen, hierarchy])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false)
        setTagSearch('')
      }
      if (epicDropdownRef.current && !epicDropdownRef.current.contains(e.target as Node)) {
        setEpicSearchOpen(false)
        setEpicSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!workItem) return null

  const states = workItem.type === 'Bug' ? BUG_STATES : TASK_STATES
  const effortFieldToWrite = workItem.effortField ?? 'Microsoft.VSTS.Scheduling.Effort'

  const toggleTag = (tagName: string) => {
    setTags((prev) => prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName])
  }

  const filteredTags = (availableTags?.value ?? []).filter(
    (t) => t.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  const handleSave = async () => {
    const patches: Array<{ op: 'add'; path: string; value: string | number }> = []

    if (title.trim() && title.trim() !== workItem.title) {
      patches.push({ op: 'add', path: '/fields/System.Title', value: title.trim() })
    }

    if (state !== workItem.state) {
      patches.push({ op: 'add', path: '/fields/System.State', value: state })
    }

    if (assignedTo !== (workItem.assignedTo ?? '')) {
      patches.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo })
    }

    if (sprintPath !== (workItem.iterationPath ?? '')) {
      patches.push({ op: 'add', path: '/fields/System.IterationPath', value: sprintPath })
    }

    const newTagsStr = tags.join('; ')
    const prevTagsStr = (workItem.tags ?? []).join('; ')
    if (newTagsStr !== prevTagsStr) {
      patches.push({ op: 'add', path: '/fields/System.Tags', value: newTagsStr })
    }

    if (descriptionTouched) {
      patches.push({ op: 'add', path: '/fields/System.Description', value: description })
    }

    // Compare as YYYY-MM-DD to avoid ISO format mismatches (ADO omits milliseconds)
    if (fechaInicio !== toDateInput(workItem.fechaInicio)) {
      patches.push({ op: 'add', path: '/fields/Custom.FechaInicio', value: fechaInicio ? toISO(fechaInicio) : '' })
    }

    if (fechaFin !== toDateInput(workItem.fechaFin)) {
      patches.push({ op: 'add', path: '/fields/Custom.FechaFin', value: fechaFin ? toISO(fechaFin) : '' })
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

    if (featureId !== null && featureId !== originalFeatureId) {
      patches.push({ op: 'add', path: '/fields/System.Parent', value: featureId })
    }

    if (patches.length === 0) { onClose(); return }

    try {
      await updateMutation.mutateAsync({ id: workItem.id, patches })
      toast.success('Elemento actualizado correctamente')
      onClose()
    } catch {
      toast.error('Error al guardar los cambios')
    }
  }

  const stateChanged = state !== workItem.state

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-w-5xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-none shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className={`px-6 py-4 flex items-center gap-4 bg-gradient-to-r transition-all duration-700 ${workItem.type === 'Bug' ? 'from-red-600 to-red-700' : 'from-blue-600 to-blue-700'}`}>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
            <Edit2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">
              #{workItem.id} · {workItem.type}
            </p>
            <DialogTitle className="text-lg font-black text-white tracking-tight leading-none truncate">
              Editar elemento de trabajo
            </DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}
            className="w-9 h-9 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all group">
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Columna principal (8/12) */}
            <div className="lg:col-span-8 space-y-5">

              {/* Título */}
              <div className="space-y-2">
                <label htmlFor="edit-title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-primary" /> Título
                </label>
                <textarea
                  id="edit-title"
                  name="title"
                  ref={titleRef}
                  rows={1}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título del elemento..."
                  className="w-full bg-transparent border-b-2 border-muted-foreground/10 py-2 text-xl font-black focus:border-primary outline-none transition-colors placeholder:text-muted-foreground/20 resize-none overflow-hidden leading-snug"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label htmlFor="edit-description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> Descripción
                </label>
                <div id="edit-description">
                {loadingDescription ? (
                  <div className="h-32 rounded-2xl border border-muted-foreground/15 bg-muted/10 animate-pulse" />
                ) : (
                  <RichTextEditor
                    key={`desc-${workItem.id}-${openCount}`}
                    initialContent={existingDescription}
                    onChange={(html) => { setDescription(html); setDescriptionTouched(true) }}
                    placeholder="Escribe para actualizar la descripción..."
                  />
                )}
                </div>
              </div>
            </div>

            {/* Sidebar (4/12) */}
            <div className="lg:col-span-4 space-y-4">

              {/* Estado */}
              <div className="space-y-1.5">
                <label id="edit-state-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Estado</label>
                <div className="flex flex-wrap gap-1.5">
                  {states.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setState(s)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${state === s ? 'text-white border-transparent shadow-sm' : 'bg-background text-muted-foreground border-muted-foreground/10 hover:bg-muted/40'}`}
                      style={state === s ? { backgroundColor: TASK_STATE_COLORS[s as keyof typeof TASK_STATE_COLORS] } : {}}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {stateChanged && (
                  <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 mt-1">
                    <span className="font-medium text-muted-foreground">{workItem.state}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-black text-primary">{state}</span>
                  </div>
                )}
              </div>

              {/* Asignado a */}
              <div className="space-y-1.5">
                <label id="edit-assigned-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Asignar Responsable
                </label>
                <Select value={assignedTo || '__none__'} onValueChange={(v) => setAssignedTo(!v || v === '__none__' ? '' : v)}>
                  <SelectTrigger aria-labelledby="edit-assigned-label" className="h-9 bg-muted/20 border-transparent rounded-xl text-xs">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {(members?.value ?? []).map((m) => (
                      <SelectItem key={m.email} value={m.email}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sprint */}
              <div className="space-y-1.5">
                <label id="edit-sprint-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Sprint</label>
                <Select value={sprintPath || '__none__'} onValueChange={(v) => setSprintPath(!v || v === '__none__' ? '' : v)}>
                  <SelectTrigger aria-labelledby="edit-sprint-label" className="h-9 bg-muted/20 border-transparent rounded-xl text-xs">
                    <SelectValue placeholder="Sin sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin sprint</SelectItem>
                    {(iterations?.value ?? []).map((i) => (
                      <SelectItem key={i.id} value={i.path}>
                        {i.name}{i.attributes.timeFrame === 'current' ? ' (actual)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Épica */}
              <div className="space-y-1.5">
                <label id="edit-epic-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                  <Target className="w-3 h-3 text-orange-400" /> Épica
                </label>
                <div ref={epicDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setEpicSearchOpen((o) => !o); setEpicSearch('') }}
                    aria-haspopup="listbox"
                    aria-expanded={epicSearchOpen}
                    aria-labelledby="edit-epic-label"
                    className="w-full h-9 flex items-center justify-between px-3 rounded-xl border border-muted-foreground/10 bg-background text-xs hover:bg-muted/30 transition-colors"
                  >
                    <span className="truncate text-left">
                      {epicId
                        ? (epics?.value.find(e => e.id === epicId)?.title ?? epicName ?? `#${epicId}`)
                        : <span className="text-muted-foreground/50">Sin épica</span>
                      }
                    </span>
                    {epicId && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setEpicId(null); setEpicName(null); setFeatureId(null); setFeatureName(null); setEpicSearch('') }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setEpicId(null); setEpicName(null); setFeatureId(null); setFeatureName(null); setEpicSearch('') } }}
                        className="flex-shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer mr-1"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/40 transition-transform ${epicSearchOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {epicSearchOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full min-w-[220px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                        <Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                        <input
                          autoFocus
                          value={epicSearch}
                          onChange={(e) => setEpicSearch(e.target.value)}
                          placeholder="Buscar épica..."
                          aria-label="Buscar épica"
                          className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/40"
                        />
                        {epicSearch && (
                          <button type="button" onClick={() => setEpicSearch('')} className="text-muted-foreground/40 hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-40 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={() => { setEpicId(null); setEpicName(null); setFeatureId(null); setFeatureName(null); setEpicSearchOpen(false); setEpicSearch('') }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/40 text-muted-foreground/40 italic"
                        >
                          Sin épica
                        </button>
                        {(epics?.value ?? []).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              setEpicId(e.id)
                              setEpicName(e.title)
                              setFeatureId(null)
                              setFeatureName(null)
                              setEpicSearchOpen(false)
                              setEpicSearch('')
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-muted/40 ${e.id === epicId ? 'bg-primary/5 text-primary font-bold' : 'text-foreground'}`}
                          >
                            <Target className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                            <span className="truncate">{e.title}</span>
                            {e.id === epicId && <span className="text-primary text-[10px] flex-shrink-0 ml-auto">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Feature */}
              {(() => {
                const displayFeature = featureId
                  ? (features?.value.find(f => f.id === featureId)?.title ?? featureName ?? String(featureId))
                  : null
                return (
                  <div className="space-y-1.5">
                    <label id="edit-feature-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                      <Box className="w-3 h-3 text-blue-400" /> Feature
                    </label>
                    <Select
                      value={featureId ? String(featureId) : '__none__'}
                      onValueChange={(v) => {
                        const newId = v === '__none__' ? null : Number(v)
                        setFeatureId(newId)
                        setFeatureName(features?.value.find(f => f.id === newId)?.title ?? null)
                      }}
                      disabled={!epicId}
                    >
                      <SelectTrigger aria-labelledby="edit-feature-label" className="h-9 bg-muted/20 border-transparent rounded-xl text-xs">
                        <span className="truncate text-left">
                          {displayFeature
                            ? displayFeature
                            : epicId
                              ? <span className="text-muted-foreground/50">Sin feature</span>
                              : <span className="text-muted-foreground/50">Selecciona una épica primero</span>
                          }
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin feature</SelectItem>
                        {(features?.value ?? []).map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })()}

              {/* Etiquetas */}
              <div className="space-y-1.5">
                <label id="edit-tags-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Etiquetas
                </label>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {tag}
                        <button type="button" onClick={() => toggleTag(tag)} className="hover:text-destructive transition-colors">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div ref={tagDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => { setTagDropdownOpen((o) => !o); setTagSearch('') }}
                    aria-haspopup="listbox"
                    aria-expanded={tagDropdownOpen}
                    aria-labelledby="edit-tags-label"
                    className="w-full h-9 flex items-center justify-between px-3 rounded-xl border border-muted-foreground/10 bg-background text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    <span>{tags.length > 0 ? `${tags.length} seleccionada${tags.length !== 1 ? 's' : ''}` : 'Seleccionar etiquetas...'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tagDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {tagDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                        <Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                        <input
                          autoFocus
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          placeholder="Buscar etiqueta..."
                          aria-label="Buscar etiqueta"
                          className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/40"
                        />
                        {tagSearch && (
                          <button type="button" onClick={() => setTagSearch('')} className="text-muted-foreground/40 hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-40 overflow-y-auto py-1">
                        {loadingTags ? (
                          <p className="text-[10px] text-muted-foreground/40 text-center py-3 flex items-center justify-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" /> Cargando etiquetas...
                          </p>
                        ) : tagsError ? (
                          <p className="text-[10px] text-destructive/70 text-center py-3">
                            Error al cargar etiquetas
                          </p>
                        ) : filteredTags.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/40 text-center py-3">
                            {tagSearch ? `Sin resultados para "${tagSearch}"` : 'Sin etiquetas disponibles'}
                          </p>
                        ) : (
                          filteredTags.map((t) => {
                            const selected = tags.includes(t.name)
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTag(t.name)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-muted/40 ${selected ? 'text-primary font-bold' : 'text-foreground'}`}
                              >
                                <div className={`w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                                  {selected && <span className="text-white text-[8px] font-black">✓</span>}
                                </div>
                                {t.name}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Prioridad */}
              <div className="space-y-1.5">
                <label id="edit-priority-label" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Prioridad
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([1, 2, 3, 4] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`h-10 rounded-xl text-[10px] font-black transition-all border-2 flex flex-col items-center justify-center gap-0.5
                        ${priority === p ? 'text-white border-transparent shadow-sm' : 'bg-background text-muted-foreground border-muted-foreground/10 hover:bg-muted/40'}`}
                      style={priority === p ? { backgroundColor: PRIORITY_COLORS[p] } : {}}
                    >
                      <span className="font-black">P{p}</span>
                      <span className="text-[8px] opacity-80 leading-none">{PRIORITY_LABELS[p]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Esfuerzo */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label htmlFor="edit-effort" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Estimado (h)
                  </label>
                  <Input id="edit-effort" name="effort" type="number" min="0" step="0.5" value={effortPoints}
                    onChange={(e) => setEffortPoints(e.target.value)} placeholder="0" className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-completed" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Registrado (h)
                  </label>
                  <Input id="edit-completed" name="completed" type="number" min="0" step="0.5" value={completedWork}
                    onChange={(e) => setCompletedWork(e.target.value)} placeholder="0" className="h-9" />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label htmlFor="edit-start" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Inicio
                  </label>
                  <div className="flex items-center bg-background rounded-xl px-3 py-2 border border-muted-foreground/10">
                    <input id="edit-start" name="startDate" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full text-xs bg-transparent outline-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-end" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" /> Fin
                  </label>
                  <div className="flex items-center bg-background rounded-xl px-3 py-2 border border-muted-foreground/10">
                    <input id="edit-end" name="endDate" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full text-xs bg-transparent outline-none" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}
            className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest border-muted-foreground/15 hover:bg-muted/50 transition-all active:scale-95">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}
            className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
