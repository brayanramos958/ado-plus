import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TASK_STATE_COLORS, type WorkItemUI, type Member } from '../types'
import { Calendar, Tag, User, MessageSquare, ChevronRight, Layout, Box, Target, Loader2, X, Clock } from 'lucide-react'
import { useWorkItemHierarchy, useWorkItemComments } from '../hooks/useWorkItems'

interface WorkItemModalProps {
  workItem: WorkItemUI | undefined
  members: Member[]
  isOpen: boolean
  onClose: () => void
}

export function WorkItemModal({ workItem, isOpen, onClose }: WorkItemModalProps) {
  const { data: hierarchy, isLoading: loadingHierarchy } = useWorkItemHierarchy(isOpen ? workItem?.id || null : null)
  const { data: commentsData, isLoading: loadingComments } = useWorkItemComments(isOpen ? workItem?.id || null : null)

  if (!workItem) return null

  // Fallback for Epic/Feature if not found
  const epicTitle = hierarchy?.epic?.fields['System.Title'] || 'Sin Épica asociada'
  const featureTitle = hierarchy?.feature?.fields['System.Title'] || 'Sin Feature asociado'
  const comments = commentsData?.comments || commentsData?.value || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-w-7xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-none shadow-2xl"
      >
        {/* Header con Gradiente y Jerarquía */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6 flex items-start gap-5">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner border border-white/5 ring-4 ring-white/5">
            <Layout className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-2">
              {loadingHierarchy ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Cargando...</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
                    <Target className="w-3 h-3 text-orange-500" /> {epicTitle}
                  </span>
                  <ChevronRight className="w-3 h-3 opacity-30" />
                  <span className="flex items-center gap-1.5 hover:text-white/80 transition-colors">
                    <Box className="w-3 h-3 text-blue-400" /> {featureTitle}
                  </span>
                </>
              )}
            </div>
            <DialogTitle className="text-2xl font-black text-white tracking-tight leading-none flex items-baseline gap-3">
              <span className="text-primary font-mono text-lg opacity-80">#{workItem.id}</span>
              {workItem.title}
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-10 h-10 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </Button>
        </div>

        {/* Contenido Principal: 3 Columnas (8:4) */}
        <div className="flex-1 overflow-y-auto px-10 py-10 space-y-10 bg-background custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-[1400px] mx-auto">
            
            {/* Columna Principal: Descripción y Comentarios (8/12) */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Descripción */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Descripción del Trabajo</h3>
                </div>
                
                {loadingHierarchy ? (
                  <div className="flex items-center justify-center h-40 bg-muted/10 rounded-[2rem] border-2 border-dashed border-muted-foreground/10">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/20" />
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed text-foreground/80 bg-muted/5 p-8 rounded-[2rem] border border-muted-foreground/5 prose prose-sm dark:prose-invert max-w-none shadow-inner">
                    {hierarchy?.task?.fields['System.Description'] ? (
                      <div dangerouslySetInnerHTML={{ __html: hierarchy.task.fields['System.Description'] as string }} />
                    ) : hierarchy?.task?.fields['System.History'] ? (
                      <div dangerouslySetInnerHTML={{ __html: hierarchy.task.fields['System.History'] as string }} />
                    ) : (
                      <p className="italic text-muted-foreground/40 text-center py-4">No hay una descripción detallada disponible.</p>
                    )}
                  </div>
                )}
              </section>

              {/* Comentarios */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1.5 bg-primary/40 rounded-full" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Hilo de Actividad</h3>
                </div>

                <div className="space-y-6">
                  {loadingComments ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground/20" /></div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                          <div className="flex-shrink-0">
                            {comment.createdBy?.imageUrl ? (
                              <img src={comment.createdBy.imageUrl} alt={comment.createdBy.displayName} className="w-10 h-10 rounded-2xl border border-border shadow-sm group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20">
                                {comment.createdBy?.displayName?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 bg-muted/20 p-4 rounded-2xl text-xs border border-transparent group-hover:border-muted-foreground/10 transition-all group-hover:bg-muted/30">
                            <div className="flex justify-between mb-2 items-start gap-2">
                              <span className="font-black text-foreground/90 text-sm tracking-tight">{comment.createdBy?.displayName}</span>
                              <span className="text-[10px] text-muted-foreground font-bold uppercase opacity-60">
                                {new Date(comment.createdDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-foreground/70 prose prose-xs dark:prose-invert max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: comment.text }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-muted/5 rounded-[2rem] border border-dashed border-muted-foreground/10">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sin comentarios aún</p>
                    </div>
                  )}
                  
                  {/* Nueva área de comentario */}
                  <div className="relative group">
                    <textarea 
                      placeholder="Deja una actualización o duda sobre esta tarea..." 
                      className="w-full bg-muted/10 border border-muted-foreground/10 rounded-[2rem] p-6 text-xs focus:ring-4 focus:ring-primary/5 focus:bg-background outline-none min-h-[120px] transition-all resize-none shadow-inner"
                    />
                    <div className="flex justify-end mt-4">
                      <Button className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-sm hover:shadow-primary/20 transition-all active:scale-95">
                        Enviar Comentario
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Columna Lateral: Metadatos (4/12) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Tarjeta de Estado y Responsable */}
              <div className="bg-muted/30 rounded-[2.5rem] p-8 border border-muted-foreground/5 space-y-8 shadow-sm">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 block mb-4">Estado del Work Item</label>
                  <div 
                    className="inline-flex px-5 py-2.5 rounded-xl text-[10px] font-black uppercase text-white shadow-lg ring-4 ring-offset-2 tracking-widest"
                    style={{ backgroundColor: TASK_STATE_COLORS[workItem.state] }}
                  >
                    {workItem.state}
                  </div>
                </div>

                <div className="pt-6 border-t border-muted-foreground/5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 block mb-4">Responsable Actual</label>
                  <div className="flex items-center gap-4 bg-background p-3 rounded-2xl border border-muted-foreground/5">
                    <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center border border-border shadow-inner">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate text-foreground/90 tracking-tight">
                        {workItem.assignedToName || 'Sin asignar'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium truncate opacity-60">
                        {workItem.assignedTo || 'Colaborador Invitado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Planificación */}
              <div className="bg-muted/10 rounded-[2.5rem] p-8 border border-muted-foreground/5 space-y-6">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 block mb-2">Cronograma</label>
                
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-sm group-hover:text-primary transition-colors">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Fecha de Inicio</span>
                    <span className="text-xs font-black text-foreground/80 tracking-tight">{workItem.fechaInicio ? new Date(workItem.fechaInicio).toLocaleDateString() : '--/--/--'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-sm group-hover:text-primary transition-colors">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Fecha de Entrega</span>
                    <span className="text-xs font-black text-foreground/80 tracking-tight">{workItem.fechaFin ? new Date(workItem.fechaFin).toLocaleDateString() : '--/--/--'}</span>
                  </div>
                </div>
              </div>

              {/* Etiquetas */}
              <div className="px-4 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Categorías / Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {workItem.tags.length > 0 ? (
                    workItem.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1.5 bg-primary/5 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-primary/10 transition-all cursor-default">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] font-bold text-muted-foreground/30 italic">Sin etiquetas registradas</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Pro */}
        <div className="px-10 py-6 border-t border-border flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground opacity-50" />
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
              Último Cambio: <span className="text-foreground/70">{new Date(workItem.changedDate).toLocaleString()}</span>
            </span>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest border-muted-foreground/15 hover:bg-muted/50 transition-all active:scale-95"
            >
              Cerrar
            </Button>
            <Button className="h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-900 text-white shadow-lg shadow-slate-900/30 hover:shadow-slate-900/50 transition-all active:scale-95 border-none">
              Abrir en ADO
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
