import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Target, Box, X, Tag, Clock, Layout, MessageSquare, Calendar, ChevronDown, Search, User } from 'lucide-react'
import { useEpics, useFeaturesByEpic, useMembers, useCreateWorkItem, useTags, useIterations } from '../hooks/useWorkItems'
import { TASK_STATE_COLORS, type WorkItemState } from '../types'

// ─── SearchableDropdown ──────────────────────────────────────────────────────

interface DropdownOption {
  value: string
  label: string
  sublabel?: string
  prefix?: React.ReactNode
}

interface SearchableDropdownProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder: string
  clearLabel: string
  searchPlaceholder?: string
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder,
  clearLabel,
  searchPlaceholder = 'Buscar...',
  icon,
  disabled,
  className = '',
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel?.toLowerCase().includes(search.toLowerCase()) ?? false)
  )

  const selected = options.find((o) => o.value === value)

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setSearch('') }}
        className={`w-full h-9 flex items-center gap-2 px-3 rounded-xl border text-xs transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed bg-muted/10 border-muted-foreground/5' : 'bg-muted/20 border-transparent hover:bg-muted/40 cursor-pointer'}
          ${open ? 'ring-2 ring-primary/20' : ''}`}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className={`flex-1 text-left truncate ${selected ? 'text-foreground font-medium' : 'text-muted-foreground/60'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSelect('') }}
            className="flex-shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[220px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/40"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground/40 hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-muted/40
                ${!value ? 'text-muted-foreground/50 font-medium' : 'text-muted-foreground/40'}`}
            >
              <span className="italic">{clearLabel}</span>
            </button>

            {filtered.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/40 text-center py-3 px-3">
                {search ? `Sin resultados para "${search}"` : 'Sin opciones disponibles'}
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-muted/40
                    ${opt.value === value ? 'bg-primary/5 text-primary font-bold' : 'text-foreground'}`}
                >
                  {opt.prefix && <span className="flex-shrink-0">{opt.prefix}</span>}
                  <span className="flex-1 min-w-0">
                    <span className="truncate block">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-muted-foreground/50 truncate block">{opt.sublabel}</span>
                    )}
                  </span>
                  {opt.value === value && (
                    <span className="text-primary text-[10px] flex-shrink-0">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CreateTaskModal ─────────────────────────────────────────────────────────

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  defaultSprintPath?: string | null
  defaultAssignedTo?: string | null
}

const TASK_CREATE_STATES: WorkItemState[] = ['Por Hacer', 'Planeado', 'En proceso', 'Bloqueado']
const BUG_CREATE_STATES: WorkItemState[] = ['New', 'Active']

export function CreateTaskModal({ isOpen, onClose, defaultSprintPath, defaultAssignedTo }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'Task' | 'Bug'>('Task')
  const [state, setState] = useState<WorkItemState>('Por Hacer')
  const [epicId, setEpicId] = useState<number | null>(null)
  const [featureId, setFeatureId] = useState<number | null>(null)
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [sprintPath, setSprintPath] = useState(defaultSprintPath || '')
  const [effortPoints, setEffortPoints] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const tagDropdownRef = useRef<HTMLDivElement>(null)

  const { data: epics } = useEpics()
  const { data: features } = useFeaturesByEpic(epicId)
  const { data: members } = useMembers()
  const { data: iterations } = useIterations()
  const { data: availableTags } = useTags()
  const createMutation = useCreateWorkItem()

  const availableStates = type === 'Task' ? TASK_CREATE_STATES : BUG_CREATE_STATES

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false)
        setTagSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSprintPath(defaultSprintPath || '')
      setTitle('')
      setType('Task')
      setState('Por Hacer')
      setEpicId(null)
      setFeatureId(null)
      setAssignedTo(defaultAssignedTo || null)
      setEffortPoints('')
      setTags([])
      setTagDropdownOpen(false)
      setTagSearch('')
      setFechaInicio('')
      setFechaFin('')
    }
  }, [isOpen, defaultSprintPath, defaultAssignedTo])

  useEffect(() => {
    setState(type === 'Task' ? 'Por Hacer' : 'New')
  }, [type])

  const handleEpicChange = (v: string) => {
    setEpicId(v ? Number(v) : null)
    setFeatureId(null)
  }

  const toggleTag = (tagName: string) => {
    setTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await createMutation.mutateAsync({
      type,
      title: title.trim(),
      state,
      assignedTo: assignedTo || undefined,
      iterationPath: sprintPath || undefined,
      parentId: featureId ?? epicId ?? undefined,
      tags: tags.length > 0 ? tags.join('; ') : undefined,
      effortPoints: effortPoints ? Number(effortPoints) : undefined,
    })
    onClose()
  }

  // Build dropdown options
  const epicOptions: DropdownOption[] = (epics?.value ?? []).map((e) => ({
    value: e.id.toString(),
    label: e.title,
    sublabel: `#${e.id}`,
    prefix: <Target className="w-3.5 h-3.5 text-orange-500" />,
  }))

  const featureOptions: DropdownOption[] = (features?.value ?? []).map((f) => ({
    value: f.id.toString(),
    label: f.title,
    sublabel: `#${f.id}`,
    prefix: <Box className="w-3.5 h-3.5 text-blue-500" />,
  }))

  const memberOptions: DropdownOption[] = (members?.value ?? []).map((m) => ({
    value: m.email,
    label: m.displayName,
    sublabel: m.email,
    prefix: (
      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary border border-primary/20 flex-shrink-0">
        {m.displayName.charAt(0)}
      </div>
    ),
  }))

  const currentSprintName =
    iterations?.value.find((i) => i.path === sprintPath)?.name ??
    iterations?.value.find((i) => i.attributes.timeFrame === 'current')?.name ??
    '—'

  const filteredTags = (availableTags?.value ?? []).filter(
    (t) => t.active && t.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-5xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-none shadow-2xl flex flex-col">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center gap-4 bg-gradient-to-r transition-all duration-700 ${type === 'Task' ? 'from-amber-600 to-amber-700' : 'from-red-600 to-red-700'}`}>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">Nuevo Elemento de Trabajo</p>
            <DialogTitle className="text-lg font-black text-white tracking-tight leading-none">
              Crear {type} en ADO
            </DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}
            className="w-9 h-9 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all group">
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Columna principal (8/12) */}
              <div className="lg:col-span-8 space-y-5">

                {/* Título */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-primary" /> Título del elemento <span className="text-destructive">*</span>
                  </label>
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="¿Qué tarea o bug estamos registrando?"
                    className="w-full bg-transparent border-b-2 border-muted-foreground/10 py-2 text-xl font-black focus:border-primary outline-none transition-all placeholder:text-muted-foreground/20"
                  />
                </div>

                {/* Tipo */}
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => setType('Task')}
                    className={`flex-1 h-auto py-3 rounded-xl border-2 transition-all font-black text-xs tracking-widest flex items-center justify-center gap-2 ${
                      type === 'Task' ? 'bg-amber-500/10 border-amber-500 text-amber-600' : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                    }`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${type === 'Task' ? 'bg-amber-500 animate-pulse' : 'bg-amber-500/40'}`} />
                    WORK TASK
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setType('Bug')}
                    className={`flex-1 h-auto py-3 rounded-xl border-2 transition-all font-black text-xs tracking-widest flex items-center justify-center gap-2 ${
                      type === 'Bug' ? 'bg-red-500/10 border-red-600 text-red-600' : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                    }`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${type === 'Bug' ? 'bg-red-500 animate-pulse' : 'bg-red-500/40'}`} />
                    BUG FIX
                  </Button>
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" /> Descripción Detallada
                  </label>
                  <div className="relative">
                    <textarea
                      placeholder="Agrega notas, requisitos técnicos o pasos para reproducir..."
                      className="w-full bg-muted/10 border border-muted-foreground/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/10 focus:bg-background outline-none min-h-[120px] transition-all resize-none"
                    />
                    <span className="absolute bottom-2 right-3 text-[9px] text-muted-foreground/30 font-bold uppercase">
                      Markdown · Vista previa en ADO
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar (4/12) */}
              <div className="lg:col-span-4 space-y-4">

                {/* 1. Asignar Responsable */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Asignar Responsable
                  </label>
                  <SearchableDropdown
                    value={assignedTo ?? ''}
                    onChange={(v) => setAssignedTo(v || null)}
                    options={memberOptions}
                    placeholder="Sin asignar"
                    clearLabel="Sin asignar"
                    searchPlaceholder="Buscar miembro..."
                    icon={<User className="w-3.5 h-3.5 text-muted-foreground/40" />}
                  />
                </div>

                {/* 2. Jerarquía */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
                    <Target className="w-3 h-3" /> Jerarquía Padre
                  </label>
                  <div className="space-y-2">
                    <SearchableDropdown
                      value={epicId?.toString() ?? ''}
                      onChange={handleEpicChange}
                      options={epicOptions}
                      placeholder="Épica"
                      clearLabel="Sin épica"
                      searchPlaceholder="Buscar épica..."
                      icon={<Target className="w-3.5 h-3.5 text-orange-500" />}
                    />
                    <SearchableDropdown
                      value={featureId?.toString() ?? ''}
                      onChange={(v) => setFeatureId(v ? Number(v) : null)}
                      options={featureOptions}
                      placeholder="Feature"
                      clearLabel="Sin feature"
                      searchPlaceholder="Buscar feature..."
                      icon={<Box className="w-3.5 h-3.5 text-blue-500" />}
                      disabled={epicId === null && featureOptions.length === 0}
                    />
                  </div>
                </div>

                {/* 3. Etiquetas */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1.5">
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
                            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/40"
                          />
                          {tagSearch && (
                            <button type="button" onClick={() => setTagSearch('')} className="text-muted-foreground/40 hover:text-foreground">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="max-h-40 overflow-y-auto py-1">
                          {filteredTags.length === 0 ? (
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

                {/* 4. Esfuerzo + Sprint */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Esfuerzo
                    </label>
                    <div className="flex items-center bg-background rounded-xl px-3 py-2 border border-muted-foreground/10 gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={effortPoints}
                        onChange={(e) => setEffortPoints(e.target.value)}
                        placeholder="pts"
                        className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-muted-foreground/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Sprint</label>
                    <Select value={sprintPath || ''} onValueChange={(v) => setSprintPath(v ?? '')}>
                      <SelectTrigger className="h-9 bg-background border-muted-foreground/10 rounded-xl text-xs">
                        <SelectValue>
                          <span className="truncate text-[11px] font-bold">{currentSprintName}</span>
                        </SelectValue>
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

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Inicio
                    </label>
                    <div className="flex items-center bg-background rounded-xl px-3 py-2 border border-muted-foreground/10">
                      <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full text-xs bg-transparent outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> Fin
                    </label>
                    <div className="flex items-center bg-background rounded-xl px-3 py-2 border border-muted-foreground/10">
                      <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                        className="w-full text-xs bg-transparent outline-none" />
                    </div>
                  </div>
                </div>

                {/* 5. Estado inicial */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Estado Inicial</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableStates.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setState(s)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${
                          state === s ? 'text-white border-transparent shadow-sm' : 'bg-background text-muted-foreground border-muted-foreground/10 hover:bg-muted/40'
                        }`}
                        style={state === s ? { backgroundColor: TASK_STATE_COLORS[s] } : {}}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Conectado a Azure DevOps
              </span>
              <span className="opacity-30">|</span>
              <span>ITS-INFOCOM</span>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}
                className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest border-muted-foreground/15 hover:bg-muted/50 transition-all active:scale-95"
                disabled={createMutation.isPending}>
                Descartar
              </Button>
              <Button type="submit"
                disabled={createMutation.isPending || !title.trim()}
                className={`h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                  type === 'Task' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                }`}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {createMutation.isPending ? 'Creando...' : `Crear ${type}`}
              </Button>
            </div>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  )
}
