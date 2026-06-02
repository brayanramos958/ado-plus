# Manual del Desarrollador — ADO Plus

> **Objetivo**: Que un desarrollador nuevo tenga el proyecto corriendo en local en 10 minutos, entienda la arquitectura, y pueda contribuir sin vivir pegado de los archivos AI.

---

## Requisitos Previos

| Software | Versión mínima | Notas |
|---|---|---|
| Node.js | 18+ | Recomendado: LTS actual |
| pnpm | 8+ | `npm install -g pnpm` |
| git | Cualquiera | Para clonar |
| Cuenta en Azure DevOps | — | Con acceso al proyecto `DESARROLLO TECNOLOGICO` |

---

## Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/brayanramos958/ado-plus.git
cd ado-plus
```

### 2. Instalar dependencias

```bash
pnpm install
```

> pnpm usa workspaces definidos en `pnpm-workspace.yaml`. Esto instala `backend/` y `frontend/` de un solo golpe.

### 3. Configurar variables de entorno

```bash
cp .env.example backend/.env
```

Editá `backend/.env` y configurá tu PAT:

```bash
PAT_TOKEN=<tu_personal_access_token_de_dev.azure.com>
```

> El archivo `.env` está en `.gitignore`. **Nunca lo comitees**.

#### ¿Cómo obtengo el PAT?

1. Ve a [https://dev.azure.com/itsinfocom](https://dev.azure.com/itsinfocom) → tu avatar → **Personal access tokens**
2. Click en **+ New Token**
3. Configurá:
   - **Nombre**: "ADO Plus" (o lo que prefieras)
   - **Scopes**: `Work Items` (Read & write) + `Project and Team` (Read)
   - **Expiración**: 30 días (o la que prefieras)
4. Copiá el token generado y pegalo en `backend/.env`

Las demás variables tienen valores por defecto que funcionan para el equipo `itsinfocom`:

```bash
ADO_ORG=itsinfocom
ADO_PROJECT=DESARROLLO%20TECNOLOGICO
ADO_PROJECT_NAME=DESARROLLO TECNOLOGICO
ADO_TEAM=DESARROLLO%20TECNOLOGICO%20Team
ADO_TEAM_ID=3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3
PORT=3001
```

> Si es la primera vez que arrancás, el backend genera automáticamente `JWT_SECRET` y `ENCRYPTION_KEY`. Solo `PAT_TOKEN` es obligatorio.

### 4. Iniciar la aplicación

```bash
pnpm dev
```

Esto levanta:
- **Backend** en `http://localhost:3001`
- **Frontend** en `http://localhost:5173`

Abrí el navegador en **http://localhost:5173** y vas a ver la pantalla de login.

#### Si el puerto 3001 está ocupado (Windows — proceso Node zombie)

```bash
taskkill /F /IM node.exe
```

---

## Arquitectura

### Stack tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript | SPA que reemplaza la UI de ADO |
| **Estado (UI)** | Zustand (`boardStore.ts`) | Filtros, modales, sprint seleccionado, vista |
| **Estado (servidor)** | TanStack Query (`useWorkItems.ts`) | Datos de ADO, cache, invalidaciones |
| **UI components** | `@base-ui/react` + Tailwind CSS v4 | Componentes base, estilos |
| **Alertas** | Sonner | Toasts de éxito/error para el usuario |
| **Backend** | Express.js | Proxy puro: inyecta auth, normaliza errores |
| **Auth (BD)** | SQLite (`better-sqlite3`) + AES-256-CBC | Usuarios, PAT encriptado, JWT |
| **Fuente de verdad** | Azure DevOps REST API v7.0 | No hay base de datos propia para work items |

### Flujo de datos

```
Browser (:5173 — React)
  ↓ fetch /api/*
Vite proxy transparente
  ↓ redirige a
Express backend (:3001)  ← ÚNICO lugar con el PAT
  ↓ + Authorization: Basic <PAT>
Azure DevOps REST API v7.0
```

**Regla de oro**: El PAT nunca llega al browser. El backend lo inyecta server-side en `proxy.ts`.

### ¿Por qué no hay base de datos propia?

Azure DevOps **es** la base de datos. El proyecto:

- Lee y escribe work items vía ADO REST API
- Solo persiste datos de autenticación (usuarios, PAT encriptado) en SQLite
- No tiene lógica de negocio en el backend — es un proxy puro

Esto significa que no hay que mantener sincronización entre dos fuentes de verdad. Si algo se crea/edita en ADO directamente, se refleja automáticamente en el board.

---

## Estructura del Proyecto

```
ado-plus/
├── backend/                    # Express proxy
│   └── src/
│       ├── auth/               # Middleware JWT, getUserPAT, authMiddleware
│       ├── routes/             # Rutas: auth, workitems, wiql, iterations, members
│       ├── config.ts           # Variables de entorno + constantes ADO
│       ├── db.ts               # SQLite (usuarios, PAT encriptado)
│       ├── index.ts            # Entry point
│       └── proxy.ts            # adoFetch() — el wrapper que inyecta auth
├── frontend/                   # React SPA
│   └── src/
│       ├── api/client.ts       # Cliente API (WIQL + batch pattern)
│       ├── hooks/              # TanStack Query hooks
│       ├── stores/             # Zustand stores (boardStore)
│       ├── components/         # Componentes UI
│       │   ├── SprintBoard/    # Board principal
│       │   ├── WorkItemModal/  # Modal de detalle
│       │   ├── CreateTaskModal/
│       │   └── ui/            # Primitivos: Dialog, Select, Sonner, etc.
│       ├── types/index.ts      # Tipos compartidos
│       └── pages/             # LoginPage, SprintPage
├── docs/                       # Documentación
│   └── manuals/
├── pnpm-workspace.yaml         # Configuración monorepo
└── package.json               # Scripts compartidos
```

---

## Comandos Principales

| Comando | Descripción |
|---|---|
| `pnpm dev` | Levanta backend + frontend juntos (concurrently) |
| `pnpm --filter ./backend dev` | Solo backend (:3001) |
| `pnpm --filter ./frontend dev` | Solo frontend (:5173) |
| `pnpm --filter ./backend build` | Compila backend → `dist/` |
| `pnpm --filter ./frontend build` | Compila frontend → `dist/` |
| `npx tsc --noEmit` | Verificación de tipos en ambos paquetes |

---

## Convenciones de Código

### TypeScript strict
- `npx tsc --noEmit` debe pasar sin errores antes de commitear.

### Separación de estado

| Librería | Uso |
|---|---|
| **TanStack Query** | Estado del servidor: work items, sprints, miembros, comentarios |
| **Zustand (`boardStore.ts`)** | Estado de UI: filtros activos, sprint seleccionado, modal abierto |
| **Sonner (`toast()`)** | Alertas de usuario — **nunca** meter estado de toast en Zustand |

```tsx
// CORRECTO — toast directo en el handler
const handleSave = async () => {
  try {
    await updateWorkItem(id, patches)
    toast.success('Cambios guardados')
  } catch {
    toast.error('Error al guardar')
  }
}

// INCORRECTO — no meter toast en el store
```

### Sin console.log

Usar logging estructurado o toasts. Para debugging, usar el panel de DevTools del navegador o breakpoints.

### Sin React.memo ni useMemo a menos que esté justificado

El board tiene pocas cards por usuario (< 20). El overhead de shallow comparison en cada re-render no justifica el beneficio. **Si pensás usar memoización, primero medí con DevTools/Performance.**

> La regla: optimizá solo cuando el profiler te diga que hay un problema.

### Dialog de Base UI (NO Radix)

```tsx
// Usar disablePointerDismissal en el root, NO onInteractOutside
<Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
  <DialogContent className="max-w-2xl sm:max-w-2xl">
    ...
  </DialogContent>
</Dialog>
```

`DialogContent` no tiene `sm:max-w-*` por defecto. Pasá ambos si querés ancho consistente:
```tsx
className="max-w-2xl sm:max-w-2xl"
```

---

## Trabajar con la API de ADO

### El patrón: WIQL → Batch

ADO no permite hacer queries complejas en una sola llamada. Siempre son **dos pasos**:

**Paso 1**: WIQL — devuelve IDs que matchean la condición
```typescript
const wiql = {
  query: `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = 'DESARROLLO TECNOLOGICO'
      AND [System.IterationPath] UNDER '${sprintPath}'
  `
}
const { workItems } = await queryWorkItems({ sprintPath })
// → { workItems: [{ id: 123 }, { id: 456 }] }
```

**Paso 2**: Batch — trae los campos completos de esos IDs
```typescript
const items = await getWorkItemsBatch(ids)
// → [{ id: 123, fields: { System.Title: "...", ... } }, ...]
```

**Nunca** hagas fetch individual para listar work items. Siempre batch.

### Campos personalizados

El proyecto usa estos campos ADO:

| Campo UI | Campo ADO | Notas |
|---|---|---|
| Esfuerzo (horas estimadas) | `Microsoft.VSTS.Scheduling.Effort` | |
| Horas registradas | `Microsoft.VSTS.Scheduling.RemainingWork` | |
| Fecha inicio | `Custom.FechaInicio` | |
| Fecha fin | `Custom.FechaFin` | |
| Prioridad | `Microsoft.VSTS.Common.Priority` | **P1=Baja, P2=Media, P3=Alta, P4=Crítica** (convención del equipo) |
| Estado | `System.State` | |
| Asignado | `System.AssignedTo` | **Es un objeto**, no un string |

### Campos en batch

Los campos que se piden en batch están declarados en `BATCH_FIELDS` en `frontend/src/api/client.ts`:

```typescript
const BATCH_FIELDS = [
  'System.Id', 'System.Title', 'System.State', 'System.WorkItemType',
  'System.AssignedTo', 'System.IterationPath', 'System.Tags',
  'System.CreatedDate', 'System.ChangedDate', 'System.CreatedBy', 'System.Rev',
  'System.Parent',                    // ← Necesario para jerarquía
  'Custom.FechaInicio', 'Custom.FechaFin',
  'Microsoft.VSTS.Scheduling.Effort',
  'Microsoft.VSTS.Scheduling.RemainingWork',
  'Microsoft.VSTS.Common.Priority',
]
```

### Authentication

El backend recibe el PAT del usuario (guardado en SQLite encriptado con AES-256-CBC) y lo inyecta en **todas** las requests a ADO:

```
Authorization: Basic <base64(pat:)>
```

El frontend solo conoce el JWT. **Nunca** se pasa el PAT al browser.

---

## SDD Workflow

Los cambios en este proyecto siguen un proceso estructurado:

```
Proposal → Spec → Design → Tasks → Apply → Verify
```

| Fase | Qué se hace |
|---|---|
| **Proposal** |Descripción del problema o necesidad. Alcance tentativo. |
| **Spec** | Requisitos funcionales, escenarios, criterios de aceptación. |
| **Design** | Decisiones de arquitectura, contracts de API, approach técnico. |
| **Tasks** | Descomposición en tareas implementables. |
| **Apply** | Implementación siguiendo las tasks. |
| **Verify** | Pruebas manuales, revisión de tipos, verificación contra spec. |

Para iniciar un SDD: consultá los skills disponibles (`sdd-*`) o mirá el historial del `PLAN.md` para ver ejemplos de cambios completados.

---

## Gotchas Técnicos (CRÍTICO — leé esto antes de tocar código)

### 1. `System.AssignedTo` es un objeto, no un string

```typescript
// INCORRECTO — asume string
const email = item.fields['System.AssignedTo']  // "user@domain.com" ❌

// CORRECTO — es un objeto con uniqueName y displayName
const assignedTo = item.fields['System.AssignedTo']
if (typeof assignedTo === 'string') {
  email = assignedTo
} else {
  email = assignedTo?.uniqueName ?? null  // "user@domain.com" ✅
}
```

### 2. Batch requiere `expand: 4` en el body, no como query string

```typescript
// INCORRECTO — $expand en query string es ignorado por ADO
GET /workitemsbatch?$expand=all

// CORRECTO — expand va en el body como número (WorkItemExpand.All = 4)
fetch('/workitemsbatch', {
  method: 'POST',
  body: JSON.stringify({ ids, fields: BATCH_FIELDS })
})
// El backend hace: { ids, expand: 4 }
```

Si no ponés `expand: 4`, ADO devuelve solo campos del sistema — los campos custom (`Custom.FechaInicio`, etc.) **desaparecen silenciosamente**.

### 3. IterationPath no se URL-encodea en WIQL

```typescript
// CORRECTO — se usa literal, sin encode
const sprintPath = "DESARROLLO TECNOLOGICO\\2026\\Q2-ABRIL-2026"
const wiql = `AND [System.IterationPath] UNDER '${sprintPath}'`
```

### 4. PATCH requiere `Content-Type: application/json-patch+json`

El backend lo maneja automáticamente en `proxy.ts` vía el parámetro `contentType`. Si estás haciendo un PATCH directo al proxy, no lo olvides.

### 5. `System.Parent` es una relación, no un campo

ADO almacena el parentesco como un **link de relación**, no como un campo. Cuando creás o editás el padre de un work item:

```typescript
// El backend en routes/workitems.ts convierte:
{ op: 'replace', path: '/fields/System.Parent', value: 123 }

// En:
{ op: 'add', path: '/relations/-', value: {
    rel: 'System.LinkTypes.Hierarchy-Reverse',
    url: 'https://dev.azure.com/itsinfocom/_apis/wit/workitems/123'
}}
```

Si asignás un padre y no funciona, revisá cómo se está enviando el patch.

### 6. Fechas — bug de timezone

```typescript
// INCORRECTO — new Date("YYYY-MM-DD") interpreta UTC midnight
// En UTC-5, toLocaleDateString() muestra el día anterior
const d = new Date("2026-05-19")  // ❌ Se interpreta como 2026-05-18T05:00:00Z

// CORRECTO — extraer componentes y construir sin zona
const [y, m, d] = "2026-05-19".split('-')
const date = new Date(Number(y), Number(m) - 1, Number(d))  // ✅ Siempre mayo 19
```

Esto afecta `WorkItemCard.tsx` y `WorkItemModal.tsx`.

### 7. `displayName` vs `@Me` en WIQL

```typescript
// INCORRECTO — @Me solo funciona para el usuario logueado
const wiql = `AND [System.AssignedTo] = '@Me'`

// CORRECTO — usar el displayName del miembro
const wiql = `AND [System.AssignedTo] = '${displayName}'`
```

`@Me` en WIQL se resuelve contra el usuario cuya PAT se está usando. No sirve para filtrar por otro miembro.

### 8. Multi-asignado: tags con prefijo `assignee:`

ADO solo soporta un `AssignedTo` nativo. Los asignados adicionales van en `System.Tags`:

```
assignee:user1@itsinfocom.com; assignee:user2@itsinfocom.com; Frontend
```

Se parsean con `parseAssigneesFromTags()` en `workitem.utils.ts`.

### 9. Chunking de batch — máximo 200 IDs por request

ADO limita a 200 IDs por request de batch. La función `getWorkItemsBatch` en `client.ts` ya hace chunking automático con `BATCH_CHUNK_SIZE = 200` y `Promise.all`.

---

## Recursos

| Recurso | Ubicación |
|---|---|
| README principal | `README.md` |
| Doc técnica completa | `PLAN.md` |
| Arquitectura y fetch pattern | `CLAUDE.md` |
| Gotchas para agentes AI | `AGENTS.md` |
| API REST de Azure DevOps | [docs.microsoft.com/en-us/rest/api/azure/devops](https://learn.microsoft.com/en-us/rest/api/azure/devops/) |
| Estado de implementación | `PLAN.md` → sección "Estado general" |