# ADO Plus — Plan de Desarrollo

Tablero de control personalizado para Azure DevOps (proyecto: DESARROLLO TECNOLOGICO).  
Frontend React + TypeScript + Vite · Backend Express proxy · ADO REST API v7.0.

---

## Estado general

| Área | Estado |
|------|--------|
| Sprint board (swimlanes por usuario) | ✅ Completo |
| Drag & drop entre columnas | ✅ Completo |
| Creación de tareas / bugs | ✅ Completo |
| Edición rápida (QuickEdit) | ✅ Completo |
| Modal de detalle con comentarios | ✅ Completo |
| Registro de horas al cambiar estado | ✅ Completo |
| Vista lista (collapse por usuario) | ✅ Completo |
| Filtros (tipo, asignado, búsqueda) | ✅ Completo |

---

## Lo que está implementado

### Sprint Board (`SprintBoard.tsx`)
- Swimlanes por usuario — filas × columnas de estado
- Filtro por usuario activo: muestra grilla de usuarios → click → entra al board de ese usuario
- Vista lista alternativa (`UserCollapseList`) controlada por `viewMode` en el store
- **Drag & drop nativo HTML5** entre celdas (usuario × estado)
  - Drop zones por celda: solo se ilumina la celda exacta al arrastrar
  - Al soltar, se actualiza el estado vía PATCH + optimistic update instantáneo
  - Al mover FROM "En proceso" a Bloqueado/Resuelto/Cerrado → abre `TimeConfirmDialog`
- Listener global `dragend` para limpiar highlight si el drag se cancela

### WorkItemCard (`WorkItemCard.tsx`)
- Dot de prioridad (P1=rojo, P2=naranja, P3=amarillo, P4=gris)
- Flechas ← → para cambiar estado directamente desde la tarjeta
- Al mover FROM "En proceso" → abre `TimeConfirmDialog`
- `isDragging`: opacidad + escala reducida mientras se arrastra (setTimeout 0ms para que el ghost se capture antes)
- Botón lápiz para abrir `WorkItemQuickEdit`
- Muestra esfuerzo estimado (h), fechaInicio, fechaFin, horas registradas

### TimeConfirmDialog (`TimeConfirmDialog.tsx`)
- Aparece al mover una tarea FROM "En proceso" a cualquiera de: Bloqueado, Resuelto, Cerrado
- Pre-llena el input con `effortPoints` (horas estimadas)
- Confirmar → registra las horas reales en `RemainingWork`
- Omitir → aplica el cambio de estado sin registrar horas
- Trigger: tanto drag & drop (SprintBoard) como flechas de estado (WorkItemCard)

### CreateTaskModal (`CreateTaskModal.tsx`)
- Campos: tipo (Task/Bug), título, estado inicial, sprint, asignado, épica → feature, tags, esfuerzo, prioridad, fechaInicio, fechaFin
- Escribe esfuerzo a `Microsoft.VSTS.Scheduling.Effort`
- Escribe prioridad a `Microsoft.VSTS.Common.Priority`

### WorkItemQuickEdit (`WorkItemQuickEdit.tsx`)
- Edición inline: estado, fechas inicio/fin, prioridad (grid P1–P4), estimado (h), registrado (h)
- Escribe esfuerzo al campo correcto detectado por `effortField` (default: `Effort`)
- Escribe horas registradas a `RemainingWork`

### WorkItemModal (`WorkItemModal.tsx`)
**Layout:**
- **Header**: breadcrumb épica → feature, título, badges de tipo + estado + prioridad
- **Arriba izquierda**: Descripción de la tarea (HTML renderizado)
- **Arriba derecha**: Panel de metadatos completos
  - Responsable (avatar + nombre + email)
  - Prioridad (dot de color + etiqueta)
  - Sprint / Iteración
  - Esfuerzo estimado (h)
  - Trabajo restante (h)
  - Fechas inicio → fin
  - Tags
  - Fecha de creación
- **Abajo (ancho completo)**: Hilo de actividad
  - Comentarios ordenados cronológicamente (más antiguo arriba, más nuevo abajo)
  - Timeline visual entre comentarios (línea conectora)
  - Auto-scroll al último comentario al abrir o al publicar uno nuevo
  - **Editor rich text** (Tiptap v3) con toolbar completo
- **Footer**: último cambio con fecha+hora, botón "Cerrar", botón "Abrir en ADO" (URL real)

### RichTextEditor (`RichTextEditor.tsx`)
Editor Tiptap v3 con sub-paneles inline (sin popovers flotantes):
- **Formato**: negrita, cursiva, subrayado, tachado
- **Estructura**: H2, H3, lista viñetas, lista numerada, código inline, bloque de código, cita, línea divisoria
- **Insertar enlace**: sub-panel con input URL
- **Insertar imagen**: sub-panel con input URL + paste desde portapapeles (compresión automática: JPEG 75%, max 900px)
- **Emoji**: grid expandible con 40 emojis en 2 categorías (Frecuentes, Trabajo)

### API & Hooks
- `createWorkItemComment(id, text)` → `POST /api/workitems/:id/comments`
- `useCreateWorkItemComment(workItemId)` → invalida comentarios + workitems al crear
- `useUpdateWorkItem` → optimistic update de estado en todas las queries cacheadas

---

## Campos ADO usados en este proyecto

| Campo UI | Campo ADO | Notas |
|----------|-----------|-------|
| Horas estimadas (Effort) | `Microsoft.VSTS.Scheduling.Effort` | NO usar StoryPoints ni OriginalEstimate |
| Horas registradas / Remaining | `Microsoft.VSTS.Scheduling.RemainingWork` | NO usar CompletedWork |
| Prioridad | `Microsoft.VSTS.Common.Priority` | 1=Crítica, 2=Alta, 3=Media, 4=Baja |
| Fecha inicio | `Custom.FechaInicio` | |
| Fecha fin | `Custom.FechaFin` | |
| Estado | `System.State` | |
| Asignado | `System.AssignedTo` | Retorna objeto `{ uniqueName, displayName }` |

---

## Arquitectura de datos

```
Browser
  └─ Vite proxy /api → :3001
       └─ Express backend (proxy puro, sin lógica de negocio)
            └─ ADO REST API v7.0
                 POST /wiql       → IDs por WIQL
                 POST /workitems/batch → campos completos ($expand=all)
                 PATCH /workitems/:id  → JSON Patch
                 POST /workitems/:id/comments → comentarios
```

**Frontend state:**
- `TanStack Query` → server state (work items, iteraciones, miembros, comentarios)
- `Zustand (boardStore)` → UI state (sprint activo, filtros, modal abierto, item editando)

---

## Pendiente / Ideas futuras

- [ ] Asignar múltiples personas a una tarea (actualmente 1:1)
- [ ] Notificaciones cuando cambia el estado de una tarea asignada
- [ ] Vista de métricas del sprint (burndown, velocidad)
- [ ] Filtros avanzados (por prioridad, por épica/feature)
- [ ] Modo de edición de descripción desde el modal
- [ ] Subir imágenes a ADO Blob Storage (en lugar de base64 en comentarios)
- [ ] Reordenar tareas dentro de una columna
