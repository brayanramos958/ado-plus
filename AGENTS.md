# AGENTS.md

Instrucciones compactas para agentes AI trabajando en **ADO Plus**. Lee esto antes de tocar código.

---

## ¿Qué es esto?

Interfaz web interna que reemplaza la UI nativa de Azure DevOps para el equipo `itsinfocom`. **No tiene base de datos propia.** Todo se lee y escribe vía ADO REST API v7.0.

---

## Monorepo & Comandos

Package manager: **pnpm** (workspaces definidos en `pnpm-workspace.yaml`).

```bash
# Raíz del proyecto
pnpm dev                        # Arranca backend + frontend juntos
pnpm --filter ./backend dev     # Solo backend (:3001)
pnpm --filter ./frontend dev    # Solo frontend (:5173)
```

No hay test suite. TypeScript check:
```bash
npx tsc --noEmit
```

Si el puerto 3001 está ocupado (Node zombie en Windows):
```bash
taskkill /F /IM node.exe
```

---

## Arquitectura de Red

```
Browser (:5173 React)
  ↓ fetch /api/*
Vite proxy transparente
  ↓ redirige a
Express backend (:3001)  ← ÚNICO lugar con el PAT token
  ↓ + Authorization: Basic <PAT>
Azure DevOps REST API v7.0
```

**Regla de oro:** El PAT nunca llega al browser. El backend lo inyecta server-side en `proxy.ts`.

---

## Azure DevOps — Datos Críticos

| Campo | Valor |
|---|---|
| Organización | `itsinfocom` |
| Proyecto | `DESARROLLO TECNOLOGICO` |
| Team ID | `3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3` |
| Sprint actual | Q2-ABRIL-2026 |

---

## Gotchas de la API ADO (no los adivinas leyendo código)

1. **`System.AssignedTo` es un objeto**, no string: `{ displayName, uniqueName, imageUrl }`. El email está en `uniqueName`.
2. **`/workitemsbatch` requiere `expand: 4` en el body** (NO `$expand` en query string). `$expand: 'all'` lowercase en el body es **ignorado silenciosamente** por ADO → no devuelve campos custom.
3. **WIQL: `IterationPath` no se URL-encodea**. Se usa literal: `DESARROLLO TECNOLOGICO\2026\Q2-ABRIL-2026`.
4. **PATCH requiere `Content-Type: application/json-patch+json`**. El proxy en `proxy.ts` lo maneja vía parámetro `contentType`.
5. **Creación de work items:** ADO solo acepta el estado inicial nativo. Si envías otro estado, el backend (`routes/workitems.ts`) separa el patch de estado y lo aplica en un PATCH posterior.
6. **Chunking de batch:** ADO limita a 200 IDs por request. `getWorkItemsBatch` en `api/client.ts` actualmente NO hace chunking — es un TODO conocido.

---

## Frontend — Convenciones que Rompen Defaults

### Estado: Zustand vs TanStack Query (separación estricta)
- **TanStack Query** → solo estado del servidor (datos ADO). Las mutaciones invalidan `['workitems']`.
- **Zustand (`boardStore.ts`)** → solo estado de UI: filtros, modales, vista, sprint seleccionado.
- **NUNCA** meter estado de toast en Zustand. Usar `toast()` de Sonner directamente en handlers.

### Dialog (`@base-ui/react`, NO Radix Dialog)
- Usar `disablePointerDismissal` en el `<Dialog>` root para evitar cierre al hacer click fuera.
- **NO** usar `onInteractOutside` (no existe en Base UI).
- `DialogContent` no tiene `sm:max-w-*` por defecto. El caller debe pasar ambos `max-w-*` y `sm:max-w-*` si quiere ancho consistente.

### Path alias
- `@/` resuelve a `frontend/src/` (configurado en `vite.config.ts`).

### Fechas — bug de timezone
- `new Date("YYYY-MM-DD")` interpreta UTC midnight. En UTC-5, `toLocaleDateString()` muestra el día anterior.
- **Solución:** extraer `[y, m, d]` del string y construir con `new Date(y, m - 1, d)`. Ver `WorkItemCard.tsx::fmtDateLocal()`.

### IDs de work items
- Usar `item.id` (raíz del objeto). `item.fields['System.Id']` puede estar ausente en batch si no se incluye explícitamente en el array de fields.

### Comparación de emails
- Siempre case-insensitive: `.toLowerCase()` al comparar `assignedTo` con emails de filtros.

### Multi-asignado (workaround)
- ADO solo soporta 1 `AssignedTo` nativo. Asignados adicionales van en `System.Tags` con prefijo `assignee:`.
- Ejemplo: `"assignee:user1@itsinfocom.com; Frontend"`.
- Parseado en `workitem.utils.ts::parseAssigneesFromTags()`.

---

## Tipos de Work Item & Estados

| Tipo | Estados válidos |
|---|---|
| **Task** | `Por Hacer` → `Planeado` → `En proceso` → `Bloqueado` → `Resuelto` → `Cerrado` |
| **Bug** | `New` → `Active` → `Resolved` → `Closed` |
| User Story | ❌ DESHABILITADO |

---

## Setup del Entorno

Backend requiere `backend/.env`:
```bash
PAT_TOKEN=<token de dev.azure.com>
ADO_ORG=itsinfocom
ADO_PROJECT=DESARROLLO%20TECNOLOGICO
ADO_PROJECT_NAME=DESARROLLO TECNOLOGICO
ADO_TEAM=DESARROLLO%20TECNOLOGICO%20Team
ADO_TEAM_ID=3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3
PORT=3001
```

> `.env` está en `.gitignore`. No commitear nunca.

Cuando el PAT expira, ADO devuelve 401. El proxy lo convierte a `{ error: 'ADO_PAT_EXPIRED' }`.

---

## Estado de Implementación

- ✅ **Fase 1**: Board por usuario (swimlanes), filtros, panel de detalle, comentarios, edición rápida, creación con jerarquía Epic→Feature→Task.
- 🔲 **Pendiente**: Chunking de batch (200 IDs), React.memo en WorkItemCard, useMemo en filteredItems, paginación lazy de epics, Azure AD OAuth (MSAL).

---

## Docs Relacionados

| Archivo | Contenido |
|---|---|
| `CLAUDE.md` | Guía específica para Claude Code. Arquitectura detallada, fetch pattern, proxy path logic. |
| `agent.md` | Contexto extendido para agentes AI. Gotchas técnicos, contratos de API, decisiones de diseño. |
| `design.md` | Documento técnico completo. Stack, estructura de archivos, contratos de API, sistema de alertas, decisiones de diseño, pendientes de performance. |
| `PLAN.md` | Especificaciones del proyecto desde cero. Organización ADO, campos, sprints, equipo, fases de implementación. |
