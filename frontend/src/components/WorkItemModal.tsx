import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TASK_STATE_COLORS, type WorkItemUI, type Member } from '../types'
import { Calendar, Tag, User, MessageSquare, ChevronRight, Layout, Box, Target, Loader2 } from 'lucide-react'
import { useWorkItemHierarchy, useWorkItemComments } from '../hooks/useWorkItems'

interface WorkItemModalProps {
  workItem: WorkItemUI | undefined
  members: Member[]
  isOpen: boolean
  onClose: () => void
}

export function WorkItemModal({ workItem, members, isOpen, onClose }: WorkItemModalProps) {
  const { data: hierarchy, isLoading: loadingHierarchy } = useWorkItemHierarchy(isOpen ? workItem?.id || null : null)
  const { data: commentsData, isLoading: loadingComments } = useWorkItemComments(isOpen ? workItem?.id || null : null)

  if (!workItem) return null

  // Fallback for Epic/Feature if not found
  const epicTitle = hierarchy?.epic?.fields['System.Title'] || 'Sin Épica asociada'
  const featureTitle = hierarchy?.feature?.fields['System.Title'] || 'Sin Feature asociado'
  const comments = commentsData?.comments || commentsData?.value || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-7xl sm:max-w-7xl md:max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header con Recorrido */}
        <div className="bg-muted/30 p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 text-xs font-medium text-muted-foreground mb-3 min-w-0">
            {loadingHierarchy ? (
              <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Cargando jerarquía...</span>
            ) : (
              <>
                <div className="flex items-center gap-1 hover:text-primary cursor-default min-w-0" title={epicTitle}>
                  <Target className="w-3 h-3 flex-shrink-0" /> 
                  <span className="truncate block max-w-full sm:max-w-[200px] lg:max-w-none">{epicTitle}</span>
                </div>
                
                <ChevronRight className="w-3 h-3 flex-shrink-0 hidden sm:block" />
                
                <div className="flex items-center gap-1 hover:text-primary cursor-default min-w-0" title={featureTitle}>
                  <Box className="w-3 h-3 flex-shrink-0" /> 
                  <span className="truncate block max-w-full sm:max-w-[300px] lg:max-w-none">{featureTitle}</span>
                </div>
                
                <ChevronRight className="w-3 h-3 flex-shrink-0 hidden sm:block" />
                
                <span className="text-primary font-bold whitespace-nowrap">#{workItem.id}</span>
              </>
            )}
          </div>
          
          <DialogTitle className="text-2xl font-bold leading-tight">
            {workItem.title}
          </DialogTitle>
        </div>

        <Separator />

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Columna Izquierda: Descripción y Comentarios */}
            <div className="md:col-span-2 space-y-8">
              {/* Descripción */}
              <section>
                <div className="flex items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Layout className="w-4 h-4" /> Descripción
                </div>
                {loadingHierarchy ? (
                  <div className="flex items-center justify-center h-32 bg-muted/20 rounded-lg border border-border/50">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed text-foreground/80 bg-muted/20 p-4 rounded-lg border border-border/50 prose prose-sm dark:prose-invert max-w-none">
                    {hierarchy?.task?.fields['System.Description'] ? (
                      <div dangerouslySetInnerHTML={{ __html: hierarchy.task.fields['System.Description'] as string }} />
                    ) : hierarchy?.task?.fields['System.History'] ? (
                      <div dangerouslySetInnerHTML={{ __html: hierarchy.task.fields['System.History'] as string }} />
                    ) : (
                      <p className="italic opacity-70">No hay descripción disponible para esta tarea.</p>
                    )}
                  </div>
                )}
              </section>

              {/* Comentarios (Mock) */}
              <section>
                <div className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <MessageSquare className="w-4 h-4" /> Comentarios
                </div>
                <div className="space-y-4">
                  {loadingComments ? (
                    <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        {comment.createdBy?.imageUrl ? (
                          <img src={comment.createdBy.imageUrl} alt={comment.createdBy.displayName} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {comment.createdBy?.displayName?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 bg-muted/30 p-3 rounded-lg text-sm min-w-0">
                          <div className="flex justify-between mb-1 items-start gap-2">
                            <span className="font-bold truncate">{comment.createdBy?.displayName}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(comment.createdDate).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-foreground/80 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: comment.text }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-2">No hay comentarios aún.</p>
                  )}
                  
                  {/* Input de comentario simulado */}
                  <div className="pt-2">
                    <textarea 
                      placeholder="Escribe un comentario..." 
                      className="w-full bg-transparent border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary outline-none min-h-[80px]"
                    />
                    <div className="flex justify-end mt-2">
                      <button className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold hover:opacity-90">
                        Comentar
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Columna Derecha: Detalles / Metadatos */}
            <div className="space-y-6">
              {/* Estado */}
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Estado</label>
                <Badge 
                  variant="outline" 
                  className="px-3 py-1 text-xs border-2 uppercase font-bold"
                  style={{ color: TASK_STATE_COLORS[workItem.state], borderColor: TASK_STATE_COLORS[workItem.state] }}
                >
                  {workItem.state}
                </Badge>
              </div>

              {/* Asignado */}
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Asignado a</label>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">
                    {workItem.assignedToName || workItem.assignedTo || 'Sin asignar'}
                  </span>
                </div>
              </div>

              {/* Fechas */}
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Planificación</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Inicio:</span>
                    <span className="font-medium">{workItem.fechaInicio ? new Date(workItem.fechaInicio).toLocaleDateString() : '--/--/--'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Fin:</span>
                    <span className="font-medium">{workItem.fechaFin ? new Date(workItem.fechaFin).toLocaleDateString() : '--/--/--'}</span>
                  </div>
                </div>
              </div>

              {/* Etiquetas */}
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Etiquetas</label>
                <div className="flex flex-wrap gap-1">
                  {workItem.tags.length > 0 ? (
                    workItem.tags.map((tag) => (
                      <div key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/5 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase">
                        <Tag className="w-2 h-2" /> {tag}
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sin etiquetas</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <Separator />
        <div className="p-4 bg-muted/10 flex justify-between items-center">
          <div className="text-[10px] text-muted-foreground uppercase font-medium">
            Actualizado: {new Date(workItem.changedDate).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cerrar
            </button>
            <button className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Abrir en ADO
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
