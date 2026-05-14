import { useRef, useEffect } from 'react'
import { toast } from 'sonner'
import DOMPurify from 'dompurify'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TASK_STATE_COLORS, PRIORITY_COLORS, PRIORITY_LABELS, type WorkItemUI, type Member } from '../types'
import {
  Calendar, Tag, User, MessageSquare, ChevronRight, Layout,
  Box, Target, Loader2, X, Clock, Zap, Flag, GitBranch, ExternalLink,
} from 'lucide-react'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}
import { useWorkItemHierarchy, useWorkItemComments, useCreateWorkItemComment, useHealth } from '../hooks/useWorkItems'
import { RichTextEditor } from './RichTextEditor'
import { TypeBadge } from './Badge'
import { Avatar } from './Avatar'

interface WorkItemModalProps {
  workItem: WorkItemUI | undefined
  members: Member[]
  isOpen: boolean
  onClose: () => void
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-muted-foreground/5 last:border-0">
      <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">{label}</p>
        <div className="text-sm font-semibold text-foreground/85">{children}</div>
      </div>
    </div>
  )
}

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function WorkItemModal({ workItem, isOpen, onClose }: WorkItemModalProps) {
  const { data: hierarchy, isLoading: loadingHierarchy } = useWorkItemHierarchy(isOpen ? workItem?.id ?? null : null)
  const { data: commentsData, isLoading: loadingComments } = useWorkItemComments(isOpen ? workItem?.id ?? null : null)
  const createComment = useCreateWorkItemComment(workItem?.id ?? 0)
  const { data: health } = useHealth()
  const commentsListRef = useRef<HTMLDivElement>(null)

  // Sort oldest → newest so the last comment is always at the bottom
  const comments = [...(commentsData?.comments ?? commentsData?.value ?? [])].sort(
    (a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
  )

  // Scroll to the newest comment after load or after posting
  useEffect(() => {
    if (!loadingComments && commentsListRef.current) {
      commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight
    }
  }, [loadingComments, comments.length])

  if (!workItem) return null

  const epicTitle = hierarchy?.epic?.fields['System.Title'] ?? 'Sin Épica'
  const featureTitle = hierarchy?.feature?.fields['System.Title'] ?? 'Sin Feature'
  const sprintName = workItem.iterationPath.split(/[/\\]/).pop() ?? workItem.iterationPath

  const adoUrl = health
    ? `https://dev.azure.com/${health.org}/${encodeURIComponent(health.project)}/_workitems/edit/${workItem.id}`
    : `https://dev.azure.com/itsinfocom/DESARROLLO%20TECNOLOGICO/_workitems/edit/${workItem.id}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-none shadow-2xl"
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-7 py-5 flex items-start gap-4 flex-shrink-0">
          <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
              {loadingHierarchy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Target className="w-3 h-3 text-orange-400 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{epicTitle}</span>
                  <ChevronRight className="w-3 h-3 opacity-30 flex-shrink-0" />
                  <Box className="w-3 h-3 text-blue-400 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{featureTitle}</span>
                </>
              )}
            </div>
            {/* Title row */}
            <div className="flex items-start gap-3 flex-wrap">
              <DialogTitle className="text-xl font-black text-white leading-tight flex items-baseline gap-2">
                <span className="text-primary/70 font-mono text-base">#{workItem.id}</span>
                {workItem.title}
              </DialogTitle>
            </div>
            {/* Badges row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <TypeBadge type={workItem.type} />
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white uppercase tracking-wide"
                style={{ backgroundColor: TASK_STATE_COLORS[workItem.state] }}
              >
                {workItem.state}
              </span>
              {workItem.priority != null && (
                <span className="flex items-center gap-1 text-[10px] font-black text-white/60">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[workItem.priority] }}
                  />
                  P{workItem.priority} · {PRIORITY_LABELS[workItem.priority]}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all group flex-shrink-0"
          >
            <X className="w-[1.125rem] h-[1.125rem] group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* ── Main scrollable body ── */}
        <div className="flex-1 overflow-y-auto bg-background">

          {/* ── Top section: Description + Metadata ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-border">

            {/* Description (left) */}
            <div className="lg:col-span-7 p-7 border-r border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-1 bg-primary rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Descripción</h3>
              </div>
              {loadingHierarchy ? (
                <div className="flex items-center justify-center h-32 rounded-xl bg-muted/10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/20" />
                </div>
              ) : hierarchy?.task?.fields['System.Description'] ? (
                <div
                  className="tiptap-content text-sm text-foreground/80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hierarchy.task.fields['System.Description'] as string) }}
                />
              ) : (
                <p className="text-sm italic text-muted-foreground/40">Sin descripción registrada.</p>
              )}
            </div>

            {/* Metadata panel (right) */}
            <div className="lg:col-span-5 p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-1 bg-primary/40 rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Información de la Tarea</h3>
              </div>

              <div className="divide-y divide-muted-foreground/5">
                {/* Assignee */}
                <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Responsable">
                  <div className="flex items-center gap-2">
                    <Avatar name={workItem.assignedToName ?? workItem.assignedTo ?? 'Sin asignar'} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{workItem.assignedToName || 'Sin asignar'}</p>
                      {workItem.assignedTo && (
                        <p className="text-[10px] text-muted-foreground truncate">{workItem.assignedTo}</p>
                      )}
                    </div>
                  </div>
                </MetaRow>

                {/* Priority */}
                {workItem.priority != null && (
                  <MetaRow icon={<Flag className="w-3.5 h-3.5" />} label="Prioridad">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PRIORITY_COLORS[workItem.priority] }}
                      />
                      <span>P{workItem.priority} — {PRIORITY_LABELS[workItem.priority]}</span>
                    </div>
                  </MetaRow>
                )}

                {/* Epic */}
                <MetaRow icon={<Target className="w-3.5 h-3.5 text-orange-400" />} label="Épica">
                  {loadingHierarchy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="text-xs">{epicTitle}</span>
                  )}
                </MetaRow>

                {/* Feature */}
                <MetaRow icon={<Box className="w-3.5 h-3.5 text-blue-400" />} label="Feature">
                  {loadingHierarchy ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="text-xs">{featureTitle}</span>
                  )}
                </MetaRow>

                {/* Sprint */}
                <MetaRow icon={<GitBranch className="w-3.5 h-3.5" />} label="Sprint / Iteración">
                  <span className="text-xs">{sprintName}</span>
                </MetaRow>

                {/* Effort */}
                <MetaRow icon={<Clock className="w-3.5 h-3.5" />} label="Esfuerzo estimado">
                  <span>{workItem.effortPoints != null ? `${workItem.effortPoints} h` : '—'}</span>
                </MetaRow>

                {/* Remaining / Completed */}
                <MetaRow icon={<Zap className="w-3.5 h-3.5" />} label="Trabajo restante">
                  <span>{workItem.completedWork != null ? `${workItem.completedWork} h` : '—'}</span>
                </MetaRow>

                {/* Dates */}
                <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Fechas">
                  <div className="text-xs space-y-0.5">
                    <p>▶ Inicio: <span className="font-bold">{fmtDate(workItem.fechaInicio)}</span></p>
                    <p>■ Fin: <span className="font-bold">{fmtDate(workItem.fechaFin)}</span></p>
                  </div>
                </MetaRow>

                {/* Tags */}
                {workItem.tags.filter((t) => !t.startsWith('assignee:')).length > 0 && (
                  <MetaRow icon={<Tag className="w-3.5 h-3.5" />} label="Tags">
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {workItem.tags
                        .filter((t) => !t.startsWith('assignee:'))
                        .map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-primary/8 text-primary border border-primary/15 rounded-lg text-[10px] font-bold">
                            {tag}
                          </span>
                        ))}
                    </div>
                  </MetaRow>
                )}

                {/* Created */}
                <MetaRow icon={<Calendar className="w-3.5 h-3.5" />} label="Creada el">
                  <span className="text-xs">{fmtDate(workItem.createdDate)}</span>
                </MetaRow>
              </div>
            </div>
          </div>

          {/* ── Comments section (full width, bottom) ── */}
          <div className="p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-primary/40 rounded-full" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  Hilo de Actividad
                </h3>
                {!loadingComments && comments.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-black">
                    {comments.length}
                  </span>
                )}
              </div>
            </div>

            {/* Comment list */}
            {loadingComments ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 bg-muted/5 rounded-2xl border border-dashed border-muted-foreground/10 mb-5">
                <MessageSquare className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sin comentarios aún — sé el primero</p>
              </div>
            ) : (
              <div
                ref={commentsListRef}
                className="space-y-4 max-h-[420px] overflow-y-auto pr-2 mb-5 custom-scrollbar"
              >
                {comments.map((comment, idx) => (
                  <div key={comment.id} className="flex gap-3 group">
                    {/* Avatar */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      {comment.createdBy?.imageUrl ? (
                        <img
                          src={comment.createdBy.imageUrl}
                          alt={comment.createdBy.displayName}
                          className="w-9 h-9 rounded-xl border border-border shadow-sm"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = 'w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20';
                              fallback.textContent = getInitials(comment.createdBy?.displayName ?? '??');
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20">
                          {getInitials(comment.createdBy?.displayName ?? '??')}
                        </div>
                      )}
                      {/* Timeline connector (skip last) */}
                      {idx < comments.length - 1 && (
                        <div className="w-px flex-1 min-h-[12px] bg-border" />
                      )}
                    </div>
                    {/* Bubble */}
                    <div className="flex-1 pb-1">
                      <div className="bg-muted/20 rounded-2xl rounded-tl-sm p-4 border border-transparent group-hover:border-muted-foreground/8 group-hover:bg-muted/30 transition-all">
                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                          <span className="text-sm font-black text-foreground/90">
                            {comment.createdBy?.displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide flex-shrink-0">
                            {new Date(comment.createdDate).toLocaleString('es', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div
                          className="tiptap-content text-sm text-foreground/75 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.text) }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rich text editor */}
            <RichTextEditor
              onSubmit={(html) => createComment.mutate(html, {
                onSuccess: () => toast.success('Comentario publicado'),
                onError: () => toast.error('Error al publicar el comentario'),
              })}
              isSubmitting={createComment.isPending}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-7 py-4 border-t border-border flex justify-between items-center bg-muted/20 flex-shrink-0">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5 opacity-50" />
            Último cambio: <span className="text-foreground/60">{new Date(workItem.changedDate).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 px-5 rounded-xl font-black text-[11px] uppercase tracking-widest"
            >
              Cerrar
            </Button>
            <a
              href={adoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-5 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-800 text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en ADO
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
