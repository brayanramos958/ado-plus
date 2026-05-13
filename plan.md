# ADO Plus — Plan de Desarrollo

Tablero de control personalizado para Azure DevOps (proyecto: DESARROLLO TECNOLOGICO).  
Frontend React + TypeScript + Vite · Backend Express proxy · ADO REST API v7.0.

---

## Sesión 2026-05-11 (continuación) — Implementación del Plan de Escalabilidad

| # | Qué se hizo | Archivos |
|---|---|---|
| 1 | **Fase 1 — Chunking de batch**: `getWorkItemsBatch` ahora divide IDs en chunks de 200 (límite ADO) y los ejecuta en paralelo con `Promise.all`. Constante `BATCH_CHUNK_SIZE = 200` y array `BATCH_FIELDS` extraídos para evitar duplicación. | `frontend/src/api/client.ts` |
| 2 | **Fase 2 — useMemo + React.memo CORRECTAMENTE**: `useMemo` en `filteredItems` ANTES de los early returns. Callbacks estabilizados con `useRef` + `useCallback` (latest ref pattern) para que `React.memo` en `WorkItemCard` realmente evite re-renders. `onClick` cambió a `(id: number) => void` en vez de `() => void` para evitar closures por item. Mismo patrón aplicado en `UserCollapseList`. | `SprintBoard.tsx`, `WorkItemCard.tsx`, `UserCollapseList.tsx` |
| 3 | **Fase 3 — Lazy loading de épicas**: `getEpics(searchQuery?: string)` ahora acepta búsqueda opcional con `CONTAINS` en WIQL. `useEpics` usa `useState` + `useEffect` con debounce de 300ms. En `WorkItemQuickEdit`, el `<Select>` de épicas se reemplazó por un autocomplete con input de búsqueda y dropdown asíncrono (mismo patrón que el selector de tags). `CreateTaskModal` sigue usando `useEpics()` sin búsqueda (carga todas). | `frontend/src/api/client.ts`, `frontend/src/hooks/useWorkItems.ts`, `WorkItemQuickEdit.tsx` |

### Decisiones importantes
- **Patrón latest ref para callbacks con memo**: `useRef(onWorkItemClick)` + `useCallback((id) => ref.current?.(id), [])` es la forma correcta de pasar callbacks estables a componentes memoizados. La alternativa con `useCallback(fn, [dep])` no funciona porque la dependencia cambia.
- **Debounce en el hook, no en el componente**: `useEpics` maneja el debounce internamente con `useState` + `useEffect`. El componente solo pasa el valor crudo del input.
- **Backward compatibility en useEpics**: `useEpics()` sin argumentos sigue cargando todas las épicas. `useEpics("texto")` aplica filtro con debounce.

---

## Sesión 2026-05-11 — Code Review + Fixes de Seguridad y Robustez

| # | Qué se hizo | Archivos |
|---|---|---|
| 1 | **Code review exhaustivo** con 4 skills especializadas (`vercel-react-best-practices`, `tailwind-css-patterns`, `typescript-advanced-types`, `nodejs-backend-patterns`). Identificados 22 hallazgos: 4 críticos, 3 altos, 12 medios, 3 bajos. | Todo el repo |
| 2 | **Fix C1 — Build error**: `fmtDateLocal()` declarada antes de los `import` en `WorkItemCard.tsx`. Movida al final del archivo como arrow function. | `WorkItemCard.tsx` |
| 3 | **Fix C2 — Backend sin manejo de errores**: Añadido middleware global de errores en `index.ts` que captura excepciones async no manejadas en rutas Express. | `backend/src/index.ts` |
| 4 | **Fix C3 — Proxy sin timeout**: `adoFetch()` ahora usa `AbortController` con 30s de timeout. Maneja `AbortError` (→ `ADO_TIMEOUT`), errores de red (→ `ADO_NETWORK_ERROR`), y respuestas no-JSON de ADO (→ `ADO_NON_JSON_RESPONSE`). | `backend/src/proxy.ts` |
| 5 | **Fix C4 — Config validación en import time**: `PAT_TOKEN` ya no usa `required()` en el top-level del módulo. `validateConfig()` se llama explícitamente en startup y en `/api/health`. `AUTH_HEADER` convertido a función `getAuthHeader()` para evitar evaluación en import time con token undefined. | `backend/src/config.ts`, `backend/src/proxy.ts`, `backend/src/index.ts` |
| 6 | **Fix H1 — XSS en WorkItemModal**: `dangerouslySetInnerHTML` en descripción y comentarios ahora pasa por `DOMPurify.sanitize()` antes de renderizar. Dependencia `dompurify` + `@types/dompurify` añadidas. | `WorkItemModal.tsx`, `frontend/package.json` |
| 7 | **Fix H2 — WIQL sin filtro de proyecto**: `getFeaturesByEpic()` en `client.ts` ahora incluye `[System.TeamProject] = 'DESARROLLO TECNOLOGICO'` para evitar traer Features de otros proyectos si el PAT tiene acceso multi-proyecto. | `frontend/src/api/client.ts` |
| 8 | **Fix H3 — Timezone en `toISO()`**: `WorkItemQuickEdit.tsx::toISO()` ahora extrae `[y, m, d]` del string de input y construye `new Date(y, m-1, d)` en vez de `new Date(local)` que interpreta UTC midnight. | `WorkItemQuickEdit.tsx` |
| 9 | **Fix M6 — Clase Tailwind inválida**: `w-4.5 h-4.5` en `WorkItemModal.tsx` cambiado a `w-[1.125rem] h-[1.125rem]`. `w-4.5` no existe en la escala de Tailwind. | `WorkItemModal.tsx` |
| 10 | **Revertido — React.memo + useMemo**: Se intentó añadir `React.memo` a `WorkItemCard` y `useMemo` a `filteredItems`/`cellMap`/`totalsByState` en `SprintBoard`. Esto causó frame drops y transiciones toscas. `memo` fuerza shallow comparison síncrona de props en cada card durante transiciones (cientos de comparaciones bloquean el hilo principal). `useMemo` añade overhead de cálculo síncrono al montar `SprintBoardTable`. Revertido a implementación original para mantener fluidez. | `WorkItemCard.tsx`, `SprintBoard.tsx` |

### Decisiones importantes
- **NO usar `React.memo`** en este proyecto: el board tiene pocas cards por usuario (< 20) y el beneficio de memoización no supera el costo de la shallow comparison en cada transición de estado/vista.
- **NO usar `useMemo`** para filtros simples: `filter()` sobre < 100 items es negligible comparado con el overhead de gestionar dependencias de memoización.
- **Backend robusto primero**: timeout, manejo de errores, y validación lazy son críticos para producción. Frontend performance es secundario con volúmenes bajos.

---

## Sesión 2026-05-07 — Cambios del día

| # | Qué se hizo | Archivos |
|---|---|---|
| 1 | **Bug fix timezone** — Fechas mostraban un día menos (ej: pones el 8, muestra el 7). Root cause: `new Date("YYYY-MM-DD")` interpreta UTC midnight → `toLocaleDateString()` en UTC-5 resta 5h y muestra el día anterior. Fix: `fmtDateLocal()` extrae YYYY-MM-DD y construye `new Date(y, m-1, d)` sin zona. Aplicado también en `WorkItemModal.tsx` con función `fmtDate()`. | `WorkItemCard.tsx`, `WorkItemModal.tsx` |
| 2 | **Sonner integrado** — Sistema de alertas con Sonner v2. `sonner.tsx` ahora es theme-aware (sin `theme="light"` hardcodeado). `App.tsx` importa `useTheme()` y pasa `theme={theme}` + `closeButton` al `<Toaster>`. Colores semánticos via CSS vars del design system (`--destructive` para error, `--foreground`/`--border` para el resto). | `components/ui/sonner.tsx`, `App.tsx` |
| 3 | **Toast wired** en los 3 puntos de mutación: `WorkItemQuickEdit` (guardar cambios), `CreateTaskModal` (crear elemento, mensaje dinámico por tipo), `WorkItemModal` (publicar comentario). Try/catch con `toast.success`/`toast.error`. | `WorkItemQuickEdit.tsx`, `CreateTaskModal.tsx`, `WorkItemModal.tsx` |
| 4 | **Limpieza** — Eliminado estado `toast`/`showToast`/`clearToast` en `boardStore.ts` (nunca se usó). Eliminados bloques de error inline en `WorkItemQuickEdit` y `WorkItemModal` que habrían duplicado el toast. | `boardStore.ts`, `WorkItemQuickEdit.tsx`, `WorkItemModal.tsx` |
| 5 | **Backdrop blur modales** — `dialog.tsx` overlay mejorado: `bg-black/50 dark:bg-black/70 backdrop-blur-sm`. Antes: `bg-black/10 backdrop-blur-xs` (2px, prácticamente invisible). Aplica a todos los modales de la app. | `components/ui/dialog.tsx` |

---

## Sesión 2026-05-06 (continuación) — Cambios del día

| # | Qué se hizo | Archivos |
|---|---|---|
| 1 | **Bug fix** — Fechas no reflejaban en card ni en modal tras editar. Root cause: `$expand: 'all'` (lowercase) es ignorado por ADO → batch devuelve solo campos del sistema, excluye `Custom.*`. Fix: switch a array `fields` explícito con todos los campos necesarios. | `api/client.ts` |
| 2 | **Bug fix** — `fechaFin` se sobreescribía siempre al llegar a "Resuelto", incluso si el usuario la había puesto manualmente. Fix: agregar condición `!workItem.fechaFin`. | `WorkItemCard.tsx` |
| 3 | **Bug fix** — `fechaFin` no se borraba al retroceder desde "Resuelto". Fix: revertido porque chocaba con la regla de prioridad del usuario. Comportamiento final: si el usuario puso la fecha, no se toca nunca automáticamente. | `WorkItemCard.tsx` |
| 4 | WorkItemModal — Epic y Feature agregados como MetaRow en el panel de metadata (además del breadcrumb del header). | `WorkItemModal.tsx` |
| 5 | WorkItemQuickEdit — Dropdowns de Épica y Feature editables. Epic carga lista completa desde ADO; Feature se filtra por epic seleccionada. Al guardar con feature distinta, patchea `System.Parent`. | `WorkItemQuickEdit.tsx` |
| 6 | `useFeaturesByEpic` — agregado `enabled: epicId != null` para no fetchear cuando no hay épica seleccionada. | `hooks/useWorkItems.ts` |
| 7 | `refetchInterval: 30_000` en `useSprintWorkItems` para mantener el board actualizado sin que el usuario tenga que recargar. | `hooks/useWorkItems.ts` |
| 8 | **Bug fix** — Dropdowns de Épica/Feature mostraban ID numérico en lugar del nombre. Root cause: Radix `<SelectValue>` no puede resolver items dinámicos no renderizados aún. Fix: bypass total — el trigger muestra `epics.find(e => e.id === epicId)?.title ?? epicName ?? String(epicId)` computado directamente en React. | `WorkItemQuickEdit.tsx` |
| 9 | **Bug fix timezone** — Fechas mostraban un día menos (ej: se pone el 8, se muestra el 7). Root cause: `new Date("YYYY-MM-DD")` es UTC midnight → `toLocaleDateString()` en UTC-5 resta 5h y muestra el día anterior. Fix: `fmtDateLocal()` extrae YYYY-MM-DD y construye `new Date(y, m-1, d)` sin zona horaria. Fix aplicado en `WorkItemCard.tsx` y `WorkItemModal.tsx`. | `WorkItemCard.tsx`, `WorkItemModal.tsx` |

---

## Sesión 2026-05-05 — Cambios del día

| # | Qué se hizo | Archivos |
|---|---|---|
| 1 | Sprint dropdown con label "Actual" en sprint corriente | `FilterBar.tsx` |
| 2 | Sprint info card rediseñada — centrada, chips de fechas, badge animado "Actual" | `SprintPage.tsx` |
| 3 | WorkItemCard responsive — header row completo como zona de drag, edit button mejorado | `WorkItemCard.tsx` |
| 4 | TimeConfirmDialog — botón X cancela sin actualizar ADO (Escape también cancela) | `TimeConfirmDialog.tsx`, `SprintBoard.tsx` |
| 5 | Dark mode fixes — header QuickEdit con azul explícito, avatares fondo gris/texto negro | `WorkItemQuickEdit.tsx`, `SprintBoard.tsx` |
| 6 | Prioridad invertida — P1=Baja, P2=Media, P3=Alta, P4=Crítica (convención del equipo) | `types/index.ts` |
| 7 | Limpieza de código — todos los comentarios en inglés, español eliminado | múltiples archivos |
| 8 | Migración a pnpm — monorepo con `pnpm-workspace.yaml`, `pnpm dev` levanta todo | `package.json`, `pnpm-workspace.yaml` |
| 9 | Tags multi-select con búsqueda — carga tags reales desde ADO | `WorkItemQuickEdit.tsx`, `CreateTaskModal.tsx` |
| 10 | **Bug fix** — Tags endpoint necesitaba `api-version=7.1-preview.1` | `routes/members.ts` |
| 11 | **Bug fix** — FechaInicio/FechaFin no se reflejaban tras guardar. Root cause: `$expand` en el body de la batch request era ignorado por ADO. Fix: `{ ids, expand: 4 }` (WorkItemExpand.All) | `api/client.ts` |
| 12 | **Bug fix** — Comparación de fechas en handleSave usaba ISO completo; ahora compara YYYY-MM-DD para evitar mismatch de formato con ADO | `WorkItemQuickEdit.tsx` |

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
| Tags multi-select desde ADO | ✅ Completo |
| FechaInicio / FechaFin en UI + lógica de prioridad | ✅ Completo (fix 2026-05-06) |
| Épica y Feature en modal de detalle | ✅ Completo (2026-05-06) |
| Cambiar Épica / Feature desde QuickEdit | ✅ Completo (2026-05-06) |
| Auto-refresh del board (cada 30s) | ✅ Completo (2026-05-06) |
| Timezone fix — fechas sin desfase de día | ✅ Completo (2026-05-07) |
| Sistema de alertas (Sonner) — success/error en mutaciones | ✅ Completo (2026-05-07) |
| Backdrop blur en modales (light + dark mode) | ✅ Completo (2026-05-07) |
| Sanitización HTML (DOMPurify) — protección XSS | ✅ Completo (2026-05-11) |
| Timeout de red en proxy (30s) | ✅ Completo (2026-05-11) |
| Manejo de errores async en backend | ✅ Completo (2026-05-11) |
| Validación lazy de configuración | ✅ Completo (2026-05-11) |
| Filtro TeamProject en WIQL de Features | ✅ Completo (2026-05-11) |
| Fix timezone en `toISO()` de QuickEdit | ✅ Completo (2026-05-11) |
| Chunking de batch (200 IDs, Promise.all) | ✅ Completo (2026-05-11) |
| React.memo + useCallback en WorkItemCard | ✅ Completo (2026-05-11) |
| useMemo en filtros de SprintBoard | ✅ Completo (2026-05-11) |
| Lazy loading de épicas con búsqueda debounced | ✅ Completo (2026-05-11) |

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
- **Épica y Feature editables**: carga jerarquía actual desde `useWorkItemHierarchy`, dropdown de Épicas (todas), dropdown de Features filtrado por épica seleccionada. Al guardar con feature distinta patchea `System.Parent`.
- Fechas con lógica de prioridad: solo se auto-setean si el campo está vacío; si el usuario las puso, nunca se sobreescriben.

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
  - **Épica** (con ícono naranja)
  - **Feature** (con ícono azul)
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
| Prioridad | `Microsoft.VSTS.Common.Priority` | **P1=Baja, P2=Media, P3=Alta, P4=Crítica** (convención invertida del equipo) |
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
                 POST /wiql                   → IDs por WIQL
                 POST /workitems/batch        → campos explícitos (fields array de 17 campos)
                 GET  /workitems/:id          → detalle individual con $expand=all (jerarquía + relaciones)
                 PATCH /workitems/:id         → JSON Patch (estado, fechas, parent, etc.)
                 POST /workitems/:id/comments → comentarios
```

**Frontend state:**
- `TanStack Query` → server state (work items, iteraciones, miembros, comentarios)
- `Zustand (boardStore)` → UI state (sprint activo, filtros, modal abierto, item editando)

---

## Pendiente / Performance

> Estos cambios no son urgentes para sprints normales (20-80 tasks) pero se vuelven necesarios con volumen alto.

### Optimizaciones de render (prioridad alta)
- [ ] **`React.memo` en `WorkItemCard`** — sin esto, TODAS las cards re-renderizan cada vez que cambia cualquier item en el cache (incluso el refetch cada 30s). Con 50+ tasks por usuario, el lag es perceptible.
- [ ] **`useMemo` en `filteredItems`** (`SprintBoard.tsx`) — el filtrado por tipo, asignado y búsqueda corre en cada render. Memoizar con `[workItems, filterType, filterAssigned, searchQuery]` como dependencias.

### Robustez de datos (prioridad media)
- [ ] **Chunking del batch** — ADO limita a 200 IDs por request. Si un sprint supera 200 tasks, el batch actual falla. Fix: partir `ids` en chunks de 200 y hacer requests en paralelo (`Promise.all`). Afecta `api/client.ts → getWorkItemsBatch`.
- [ ] **`useEpics` paginación lazy** — actualmente fetchea todas las épicas al abrir QuickEdit por primera vez (múltiples chunks de 200 en secuencia si hay muchas épicas). Alternativa: búsqueda con debounce contra ADO en lugar de cargar todas.

---

## Pendiente / Ideas futuras

- [ ] Asignar múltiples personas a una tarea (actualmente 1:1)
- [ ] Notificaciones cuando cambia el estado de una tarea asignada
- [ ] Vista de métricas del sprint (burndown, velocidad)
- [ ] Filtros avanzados (por prioridad, por épica/feature)
- [ ] Modo de edición de descripción desde el modal de detalle
- [ ] Subir imágenes a ADO Blob Storage (en lugar de base64 en comentarios)
- [ ] Reordenar tareas dentro de una columna

---

## Implementación futura — Login + PAT por usuario

### Contexto

ADO Plus actualmente expone el PAT en el `.env` del backend. El objetivo es:
1. Sistema de login (JWT) con registro abierto
2. Cada usuario guarda su propio PAT de ADO, encriptado AES-256-CBC en SQLite
3. Org/proyecto ADO sigue siendo global (`.env`); solo el PAT es per-user
4. En cada request autenticada, el backend usa el PAT del usuario en lugar del global

### Decisiones

| Pregunta | Respuesta |
|---|---|
| Registro | **Abierto** |
| PAT encriptado | **Sí — AES-256-CBC** |
| Org/proyecto ADO | **Global** (solo PAT es per-user) |

### Arquitectura

```
Browser → LoginPage / PATSetupPage
       → JWT en localStorage
       → Authorization: Bearer <token> en cada request
       → backend middleware valida JWT
       → extrae PAT encriptado de SQLite → desencripta → inyecta en adoFetch()
```

### Dependencias nuevas (backend)

```bash
npm install better-sqlite3 bcryptjs jsonwebtoken
npm install -D @types/better-sqlite3 @types/bcryptjs @types/jsonwebtoken
```

### Archivos a crear/modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `backend/src/db.ts` | Crear | SQLite init, tabla `users`, helpers CRUD, `encryptPAT`/`decryptPAT` |
| `backend/src/routes/auth.ts` | Crear | `POST /register`, `POST /login`, `POST /pat`, `GET /me` |
| `backend/src/auth/authMiddleware.ts` | Crear | Valida Bearer JWT, adjunta `req.user = { userId, email }` |
| `backend/src/proxy.ts` | Modificar | `adoFetch(path, options, patToken?)` — fallback a config global |
| `backend/src/config.ts` | Modificar | Leer `JWT_SECRET` y `ENCRYPTION_KEY` (requeridas) |
| `backend/src/index.ts` | Modificar | Montar auth router, iniciar DB en startup |
| `backend/src/routes/workitems.ts` | Modificar | `requireAuth` + usar PAT del usuario |
| `backend/src/routes/wiql.ts` | Modificar | idem |
| `backend/src/routes/iterations.ts` | Modificar | idem |
| `backend/src/routes/members.ts` | Modificar | idem |
| `backend/.env.example` | Modificar | Agregar `JWT_SECRET`, `ENCRYPTION_KEY` |
| `frontend/src/context/AuthContext.tsx` | Crear | Estado auth: user, token. Acciones: login, register, logout, savePAT |
| `frontend/src/pages/LoginPage.tsx` | Crear | Tabs Iniciar sesión / Crear cuenta |
| `frontend/src/pages/PATSetupPage.tsx` | Crear | Input PAT con link a dev.azure.com |
| `frontend/src/api/client.ts` | Modificar | `Authorization: Bearer <token>` en todas las llamadas |
| `frontend/src/App.tsx` | Modificar | Guards: sin user → LoginPage, sin PAT → PATSetupPage |
| `frontend/src/components/Header.tsx` | Modificar | Email del usuario + botón cerrar sesión |

### Variables de entorno nuevas

```env
JWT_SECRET=<string aleatorio 64 chars>
ENCRYPTION_KEY=<string exactamente 32 chars>
```

### Checklist de verificación

- [ ] Sin token → cualquier `/api/*` devuelve 401
- [ ] Registro → JWT válido
- [ ] Login correcto → JWT; incorrecto → error
- [ ] Sin PAT → redirige a PATSetupPage
- [ ] Con PAT → board carga con el PAT del usuario autenticado
- [ ] PAT expirado → frontend muestra opción de actualizar PAT
- [ ] Logout → elimina token → redirige a LoginPage
