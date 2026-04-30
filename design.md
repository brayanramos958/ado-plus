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
| Zustand | — | Estado de UI (filtros, modales, vista) |
| TailwindCSS | 3.x | Utilidades CSS |

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
        ├── components/
        │   ├── Header.tsx        ← Logo, indicador de conexión, toggle Board/Lista, btn Nueva Tarea
        │   ├── FilterBar.tsx     ← Selectors: Sprint, Tipo, Asignado + buscador de texto
        │   ├── SprintBoard.tsx   ← Tabla swimlane: filas = usuarios, cols = estados
        │   │                        Aplica filtros del boardStore antes de renderizar
        │   ├── WorkItemCard.tsx  ← Tarjeta: ID, tipo, título, tags, avatar, estado, fechas custom
        │   ├── Avatar.tsx        ← Círculo con iniciales o imagen
        │   ├── Badge.tsx         ← Badge, TypeBadge, StateBadge con mapeo de colores
        │   └── Spinner.tsx       ← Spinner, PageLoader
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
  sprintPath: string | null,      // path completo del sprint activo
  filterType: string | null,      // 'Task' | 'Bug' | null
  filterAssigned: string | null,  // email | 'unassigned' | null
  searchQuery: string,
  viewMode: 'board' | 'list',
  selectedWorkItemId: number | null,
  isCreateModalOpen: boolean,
  toast: { message, type } | null
}
```

---

## Decisiones de diseño

| Decisión | Rationale |
|---|---|
| Backend como BFF (proxy delgado) | PAT no expuesto en browser. Cuando migre a OAuth, solo cambia el backend. |
| WIQL + batch en 2 pasos | WIQL devuelve solo IDs (liviano), batch recupera solo los campos necesarios. |
| `$expand: 'all'` en batch | Evita errores 400 por campos custom que no existen en todos los tipos de WI. |
| Normalizar members en backend | El frontend recibe un contrato limpio; no conoce la estructura interna de ADO. |
| Zustand para UI, TanStack Query para servidor | Separación clara: estado de servidor (TQ) vs estado de UI (Zustand). |
| No usar `System.IterationPath` con doble prefijo en WIQL | El path que devuelve ADO ya incluye el nombre del proyecto como raíz. |
| Tags `assignee:` como multi-asignado | Workaround nativo de ADO que no rompe el sistema, parseado en `workitem.utils.ts`. |

---

## Pendiente (Fase 2)

- [ ] Vista Lista (tabla filtrable)
- [ ] Formulario de creación de Work Item (`react-hook-form` + `zod`)
- [ ] Mutaciones: `useCreateWorkItem` con optimistic update
- [ ] Botón "Nueva Tarea" conectado al modal
- [ ] Filtro multi-sprint (selección de varios sprints a la vez)
