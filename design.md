# ADO Plus — Design Document

Documento de diseño técnico del estado actual de la aplicación.
Refleja la implementación real, no la planificada.

---

## Stack tecnológico en uso

### Backend
| Herramienta | Versión | Rol |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.x | HTTP server / router |
| TypeScript | 5.x | Tipado estático |
| ts-node | — | Ejecución TS en desarrollo |
| nodemon | 3.x | Hot-reload del servidor |
| dotenv | — | Variables de entorno |
| cors | — | Habilita peticiones cross-origin desde Vite |

### Frontend
| Herramienta | Versión | Rol |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.x | Bundler + dev server con proxy |
| TanStack Query | v5 | Estado del servidor, caché, invalidación |
| Zustand | 5.x | Estado de UI (filtros, modales, vista) |
| TailwindCSS | 3.x | Utilidades CSS |
| shadcn/ui | — | Componentes UI (Button, Dialog, Select, Popover, etc.) |
| Radix UI | — | Primitivos headless usados por shadcn/ui |
| @base-ui/react | 1.x | Dialog (reemplaza Radix Dialog — ver nota abajo) |
| Tiptap | v3 | Editor rich text para descripción y comentarios |
| Sonner | 2.x | Sistema de alertas/toasts (success, error, info, warning) |
| Lucide React | — | Íconos |
| date-fns | 4.x | Utilidades de fechas |

---

## Arquitectura de datos

### Flujo de lectura (Board)
```
SprintPage
  ↓ useCurrentSprint() → useIterations()
  ↓ auto-set sprintPath en boardStore
  ↓
FilterBar (sprintPath, filterType, filterAssigned, searchQuery)
  ↓
SprintBoard
  ↓ useSprintWorkItems(sprintPath)
      1. POST /api/wiql → lista de IDs
      2. POST /api/workitems/batch → detalles completos ($expand: all)
      3. mapeo ADO → WorkItemUI
  ↓
SprintBoardTable (swimlanes por usuario × columnas por estado)
  ↓
WorkItemCard (tarjeta individual)
```

### Flujo de escritura (Mutation)
```
[Componente] → useUpdateWorkItem() → api.updateWorkItem(id, patches)
  → PATCH /api/workitems/:id
  → backend: adoFetch() con Content-Type: application/json-patch+json
  → TanStack Query: invalidateQueries(['workitems']) → re-fetch automático
```

---

## Estructura de archivos

```
ado-plus/
│
├── agent.md                    ← contexto para agentes AI
├── design.md                   ← este archivo
├── package.json                ← npm workspaces, script `dev` raíz
│
├── backend/
│   ├── .env                    ← PAT_TOKEN y config (nunca commitear)
│   ├── .env.example            ← template
│   ├── nodemon.json
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── index.ts            ← Express app: monta routers, /api/health, listen
│       ├── config.ts           ← Lee env vars, exporta config + helpers de URL
│       ├── proxy.ts            ← adoFetch(): inyecta PAT, maneja 401, devuelve { status, data }
│       └── routes/
│           ├── workitems.ts    ← CRUD: GET /:id, POST /, PATCH /:id, DELETE /:id
│           │                      POST /batch, GET|POST /:id/comments
│           ├── wiql.ts         ← POST / → ejecuta query WIQL, devuelve { workItems: [{id}] }
│           ├── iterations.ts   ← GET / (todos), GET /current
│           └── members.ts      ← GET / (normalizado), GET /wit/types, GET /wit/states/:type
│
└── frontend/
    ├── vite.config.ts          ← proxy /api → http://localhost:3001
    ├── package.json
    └── src/
        ├── main.tsx            ← Root: StrictMode + QueryClientProvider + App
        ├── App.tsx             ← Monta SprintPage
        ├── index.css           ← Tailwind directives
        │
        ├── types/
        │   └── index.ts        ← Todos los tipos e interfaces del proyecto
        │                          WorkItemUI, WorkItemField, ADOIdentity,
        │                          Iteration, Member, TASK_STATES, colores
        │
        ├── api/
        │   └── client.ts       ← Wrappers de fetch: getHealth, getIterations,
        │                          getMembers, queryWorkItems (WIQL), getWorkItemsBatch,
        │                          updateWorkItem, createWorkItem, deleteWorkItem
        │
        ├── hooks/
        │   └── useWorkItems.ts ← TanStack Query hooks:
        │                          useHealth, useIterations, useMembers,
        │                          useCurrentSprint, useSprintWorkItems,
        │                          useUpdateWorkItem, useCreateWorkItem, useDeleteWorkItem
        │
        ├── store/
        │   └── boardStore.ts   ← Zustand store (estado UI):
        │                          sprintPath, filterType, filterAssigned,
        │                          searchQuery, viewMode, selectedWorkItemId,
        │                          isCreateModalOpen, toast
        │
        ├── lib/
        │   └── workitem.utils.ts ← Utilidades puras:
        │                           parseAssigneesFromTags, getDisplayNameFromEmail,
        │                           getInitials, buildPatchState, buildPatchAssignee,
        │                           groupByAssignee, groupByState
        │
        ├── context/
        │   └── ThemeContext.tsx   ← ThemeProvider + useTheme(). Toggle light/dark. Persiste en localStorage.
        │
        ├── components/
        │   ├── Header.tsx              ← Logo, indicador de conexión ADO, toggle Board/Lista, btn Nueva Tarea, toggle dark mode
        │   ├── FilterBar.tsx           ← Selectors: Sprint, Tipo, Asignado + buscador de texto
        │   ├── SprintBoard.tsx         ← Tabla swimlane: filas = usuarios, cols = estados. Aplica filtros del boardStore.
        │   ├── WorkItemCard.tsx        ← Tarjeta: ID, tipo, título, tags, avatar, estado, fechas custom, drag & drop
        │   ├── WorkItemModal.tsx       ← Modal de detalle completo: breadcrumb, metadata, comentarios (Tiptap)
        │   ├── WorkItemQuickEdit.tsx   ← Modal de edición rápida: todos los campos editables incl. Épica/Feature
        │   ├── CreateTaskModal.tsx     ← Modal de creación: Task/Bug con jerarquía Epic→Feature→Task
        │   ├── TimeConfirmDialog.tsx   ← Dialog de registro de horas al mover FROM "En proceso"
        │   ├── RichTextEditor.tsx      ← Editor Tiptap v3 con toolbar: formatos, listas, código, imagen, emoji
        │   ├── UserCollapseList.tsx    ← Vista lista (alternativa al board)
        │   ├── Avatar.tsx              ← Círculo con iniciales o imagen de ADO
        │   ├── Badge.tsx               ← Badge, TypeBadge, StateBadge con mapeo de colores
        │   └── Spinner.tsx             ← Spinner, PageLoader
        │
        └── components/ui/             ← Componentes shadcn/ui (no editar salvo ajustes de tema)
            ├── sonner.tsx              ← Toaster wrapper theme-aware. Usa CSS vars del design system.
            ├── dialog.tsx              ← Dialog de @base-ui/react. Backdrop: bg-black/50 dark:bg-black/70 backdrop-blur-sm
            ├── button.tsx
            ├── select.tsx
            ├── input.tsx
            ├── tooltip.tsx
            └── ...otros primitivos
        │
        └── pages/
            └── SprintPage.tsx    ← Página principal:
                                     - Lee sprint actual y todas las iteraciones
                                     - Auto-setea sprintPath en mount
                                     - Muestra header del sprint seleccionado (no siempre el actual)
                                     - Abre WorkItemDetailPanel al click en tarjeta
```

---

## Contratos de API (endpoints implementados)

### GET `/api/health`
```json
{ "status": "ok", "org": "itsinfocom", "project": "DESARROLLO TECNOLOGICO" }
```

### GET `/api/iterations`
```json
{
  "value": [
    {
      "id": "...",
      "name": "Q2-ABRIL-2026",
      "path": "DESARROLLO TECNOLOGICO\\2026\\Q2-ABRIL-2026",
      "attributes": { "startDate": "...", "finishDate": "...", "timeFrame": "current" }
    }
  ]
}
```

### GET `/api/members` ← normalizado en el backend
```json
{
  "value": [
    {
      "email": "jcastro03@itsinfocom.com",
      "displayName": "Johan Alexis Castro Moreno",
      "avatar": "https://dev.azure.com/itsinfocom/_api/_common/identityImage?id=...",
      "isAdmin": false
    }
  ],
  "count": 16
}
```

### POST `/api/wiql`
**Body**: `{ "query": "SELECT [System.Id] FROM WorkItems WHERE ..." }`
**Response**: `{ "workItems": [{ "id": 123 }, ...] }`

### POST `/api/workitems/batch`
**Body**: `{ "ids": [123, 456], "$expand": "all" }`
**Response**: `{ "value": [WorkItem, ...] }` — estructura nativa ADO con `fields` expandidos

### PATCH `/api/workitems/:id`
**Body**: `[{ "op": "add", "path": "/fields/System.State", "value": "En proceso" }]`
**Content-Type requerido por ADO**: `application/json-patch+json` (el backend lo inyecta)

---

## Tipo clave: WorkItemUI

Este es el tipo central que circula por toda la UI:

```typescript
interface WorkItemUI {
  id: number
  title: string
  type: 'Task' | 'Bug' | 'Epic' | 'Feature' | 'Issue'
  state: WorkItemState
  iterationPath: string
  assignedTo: string | null        // email — de ADOIdentity.uniqueName
  assignedToName: string | null    // nombre completo — de ADOIdentity.displayName
  tags: string[]                   // parseados de System.Tags, sin prefijo "assignee:"
  createdDate: string
  changedDate: string
  createdBy: string
  rev: number
  // Solo Tasks:
  fechaInicio?: string
  fechaFin?: string
  tipoHistoriaTecnica?: string
}
```

---

## Estado global (Zustand — boardStore)

```typescript
// Persistencia: en memoria (se pierde al recargar — intencional en MVP)
{
  sprintPath: string | null,        // path completo del sprint activo
  filterType: string | null,        // 'Task' | 'Bug' | null
  filterAssigned: string | null,    // email | 'unassigned' | null
  searchQuery: string,
  viewMode: 'board' | 'list',
  selectedWorkItemId: number | null,
  isCreateModalOpen: boolean,
  editingWorkItemId: number | null,
  currentUser: string | null,
}
// NOTA: no hay estado de toast aquí — las alertas van directo con toast() de Sonner
```

## Sistema de alertas (Sonner)

Sonner es el sistema de alertas de toda la app. Flujo estándar:

```typescript
import { toast } from 'sonner'

// En cualquier handler async (mutateAsync):
try {
  await mutation.mutateAsync(data)
  toast.success('Mensaje de éxito')
  onClose()
} catch {
  toast.error('Mensaje de error')
}

// Para callbacks de .mutate() (ej. drag & drop, TimeConfirmDialog):
updateMutation.mutate({ id, patches }, {
  onSuccess: () => toast.success('"Título" → NuevoEstado'),
  onError: () => toast.error('Error al cambiar el estado'),
})
```

**Puntos donde se activan toasts:**
| Acción | Tipo | Mensaje |
|---|---|---|
| Guardar edición (QuickEdit) | success / error | `Elemento actualizado correctamente` |
| Crear Task/Bug | success / error | `Task creado correctamente` |
| Publicar comentario | success / error | `Comentario publicado` |
| Drag & drop de estado | success / error | `"Título" → NuevoEstado` |
| TimeConfirmDialog confirmar | success / error | `Cerrado — 4h registradas` |
| TimeConfirmDialog omitir | success / error | `Estado cambiado a Cerrado` |

**Configuración** (`App.tsx`):
```tsx
<Toaster richColors theme={theme} position="top-right" closeButton />
```
- `position`: `top-right`
- `theme`: sincronizado con `useTheme()` del ThemeContext (light/dark reactivo)

**Paleta de colores** (`index.css` — overrides vía `[data-sonner-toast][data-type='...']`):

Mimetizan exactamente el `StateBadge` de las cards:

| Tipo | Light mode | Dark mode |
|---|---|---|
| `success` | `green-100` / `green-800` | `green-900/35` / `green-300` |
| `error` | `red-100` / `red-800` | `red-900/35` / `red-300` |
| `warning` | `orange-100` / `orange-800` | `orange-900/35` / `orange-300` |
| `info` | `blue-100` / `blue-800` | `blue-900/35` / `blue-300` |

En dark mode se aplica `backdrop-filter: blur(8px)` para efecto glass. El selector dark usa `html.dark` (ThemeContext aplica la clase en `document.documentElement`).

**Regla**: NO usar estado de toast en Zustand. NO mostrar errores inline cuando ya hay un toast. Un solo canal de feedback.

---

## Decisiones de diseño

| Decisión | Rationale |
|---|---|
| Backend como BFF (proxy delgado) | PAT no expuesto en browser. Cuando migre a OAuth, solo cambia el backend. |
| WIQL + batch en 2 pasos | WIQL devuelve solo IDs (liviano), batch recupera solo los campos necesarios. |
| `fields` array explícito en batch (NO `$expand`) | `$expand: 'all'` (lowercase) es ignorado por ADO — solo devuelve campos del sistema, excluye `Custom.*`. Fix definitivo: array explícito de 17+ campos en `getWorkItemsBatch`. |
| Normalizar members en backend | El frontend recibe un contrato limpio; no conoce la estructura interna de ADO. |
| Zustand para UI, TanStack Query para servidor | Separación clara: estado de servidor (TQ) vs estado de UI (Zustand). |
| No usar `System.IterationPath` con doble prefijo en WIQL | El path que devuelve ADO ya incluye el nombre del proyecto como raíz. |
| Tags `assignee:` como multi-asignado | Workaround nativo de ADO que no rompe el sistema, parseado en `workitem.utils.ts`. |
| Sonner para alertas (sin estado en Zustand) | `toast()` de Sonner se llama directamente en handlers — no necesita pasar por el store. Más simple, desacoplado del ciclo de render. |
| `@base-ui/react` Dialog en lugar de Radix Dialog | Base UI permite `disablePointerDismissal` directamente en el root. Radix requería `onInteractOutside`. Todos los modales usan `disablePointerDismissal` para evitar cierres accidentales. |
| Fechas: `new Date(y, m-1, d)` no `new Date(isoString)` | `new Date("YYYY-MM-DD")` interpreta UTC → `toLocaleDateString()` en UTC-5 muestra el día anterior. Siempre extraer partes y construir fecha local. |
| `item.id` (raíz) no `item.fields['System.Id']` | ADO devuelve el ID en la raíz del objeto. `System.Id` puede estar ausente del batch si no se incluye explícitamente en el fields array. |

---

## Pendiente / Performance

> Estos cambios no son urgentes para sprints normales (20-80 tasks) pero se vuelven necesarios con volumen alto.

### Optimizaciones de render (prioridad alta)
- [ ] **`React.memo` en `WorkItemCard`** — sin esto, TODAS las cards re-renderizan cada vez que cambia cualquier item en el cache (incluso el refetch cada 30s). Con 50+ tasks por usuario, el lag es perceptible.
- [ ] **`useMemo` en `filteredItems`** (`SprintBoard.tsx`) — el filtrado por tipo, asignado y búsqueda corre en cada render. Memoizar con `[workItems, filterType, filterAssigned, searchQuery]` como dependencias.

### Robustez de datos (prioridad media)
- [ ] **Chunking del batch** — ADO limita a 200 IDs por request. Fix: partir `ids` en chunks de 200 y hacer requests en paralelo (`Promise.all`). Afecta `api/client.ts → getWorkItemsBatch`.
- [ ] **`useEpics` paginación lazy** — actualmente fetchea todas las épicas al abrir QuickEdit. Alternativa: búsqueda con debounce contra ADO.

### Ideas futuras
- [ ] Asignar múltiples personas a una tarea
- [ ] Vista de métricas del sprint (burndown, velocidad)
- [ ] Filtros avanzados (por prioridad, por épica/feature)
- [ ] Edición de descripción desde el modal de detalle
- [ ] Subir imágenes a ADO Blob Storage (en lugar de base64)
