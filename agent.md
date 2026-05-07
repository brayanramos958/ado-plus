# ADO Plus — Agent Context

Este documento es la fuente de verdad para cualquier agente AI que trabaje en este proyecto.
Léelo ANTES de tocar cualquier archivo.

---

## ¿Qué es este proyecto?

Interfaz web interna que reemplaza la UI nativa de Azure DevOps para el equipo de `itsinfocom`.
**No tiene base de datos propia.** Azure DevOps es la única fuente de verdad. Todo se lee y escribe vía API REST v7.0.

---

## Arquitectura de comunicación

```
Browser (React)
  ↓ fetch /api/*
Vite Dev Server :5173  ← proxy transparente
  ↓ redirige a
Express Backend :3001  ← ÚNICO lugar donde está el PAT token
  ↓ + Authorization: Basic <base64(:<PAT>)>
Azure DevOps REST API v7.0
```

**Regla de oro**: El PAT NUNCA llega al browser. El backend lo inyecta en cada request.

---

## Datos críticos de la organización ADO

| Campo | Valor |
|---|---|
| Organización | `itsinfocom` |
| Proyecto | `DESARROLLO TECNOLOGICO` |
| Team ID | `3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3` |
| API Version | `7.0` |
| URL Base | `https://dev.azure.com/itsinfocom` |

---

## Gotchas conocidos — leer ANTES de modificar

### API de Azure DevOps

1. **`System.AssignedTo` es un objeto, no un string.**
   ADO devuelve `{ displayName, uniqueName, imageUrl }`.
   El email está en `uniqueName`. Ya está normalizado en `useWorkItems.ts`.

2. **`/workitemsbatch` — usar `expand: 4` en el body (NO `$expand`).**
   - `$expand` es para query string params, no para el body. ADO lo ignora silenciosamente → devuelve solo campos por defecto, excluyendo custom fields.
   - La propiedad correcta del body es `expand` con valor entero: `WorkItemExpand.All = 4`.
   - Usar `fields: [...]` explícito causa 400 si cualquier campo no existe en el proyecto.
   - Solución correcta: `{ ids, expand: 4 }` en `getWorkItemsBatch` (`frontend/src/api/client.ts`).

3. **El `IterationPath` en queries WIQL no debe URL-encodear la `\`.**
   El path viene así: `DESARROLLO TECNOLOGICO\2026\Q2-ABRIL-2026`.
   El campo ya incluye el nombre del proyecto al inicio — NO concatenar.

4. **PATCH de work items requiere `Content-Type: application/json-patch+json`.**
   El proxy en `proxy.ts` lo maneja vía el parámetro `contentType`.

5. **Los miembros del equipo vienen anidados:**
   ADO devuelve `{ isTeamAdmin?, identity: { uniqueName, displayName, imageUrl } }`.
   El backend normaliza esto en `routes/members.ts` antes de enviarlo al frontend.

6. **Puerto 3001 EADDRINUSE:** Puede quedar un proceso zombie de Node.
   Solución: `taskkill /F /IM node.exe` en Windows.

### React / Frontend

7. **No llamar setters de Zustand en el cuerpo del componente.**
   Solo en `useEffect`, handlers o `onChange`. Causa warning de React y loops.

8. **Las comparaciones de email deben ser case-insensitive.**
   Usar siempre `.toLowerCase()` al comparar `assignedTo` con emails del filtro.

---

## Tipos de Work Item y sus estados

| Tipo | Estados |
|---|---|
| **Task** | `Por Hacer` → `Planeado` → `En proceso` → `Bloqueado` → `Resuelto` → `Cerrado` |
| **Bug** | `New` → `Active` → `Resolved` → `Closed` |
| User Story | ❌ DESHABILITADO en este proyecto |

---

## Multi-asignado (workaround)

ADO solo soporta 1 `System.AssignedTo` nativo.
Para tareas con más de un responsable se usa `System.Tags` con el prefijo `assignee:`.

**Ejemplo:** `"assignee:user1@itsinfocom.com; assignee:user2@itsinfocom.com; Frontend"`

- Tags sin prefijo `assignee:` → se muestran como etiquetas en la tarjeta.
- Tags con prefijo `assignee:` → se parsean en `workitem.utils.ts::parseAssigneesFromTags()`.

---

## Campos Custom (solo en Tasks)

| Campo ADO | Propósito |
|---|---|
| `Custom.FechaInicio` | Fecha de inicio (dateTime) |
| `Custom.FechaFin` | Fecha de fin (dateTime) |
| `Custom.TipoHistoriaTecnica` | Categorización de la tarea |

Estos campos NO existen en Bug/Epic/Feature. El formulario solo los muestra si `type === 'Task'`.

---

## Sprints

- Estructura trimestral: `DESARROLLO TECNOLOGICO\2026\Q2-ABRIL-2026`
- Sprint actual: **Q2-ABRIL-2026** (2026-04-01 al 2026-04-30)
- 18 sprints registrados en total
- El timeFrame `'current'` lo indica la API de ADO directamente en `iterations.attributes.timeFrame`

---

## Equipo (16 personas)

Emails en formato `<prefijo>@itsinfocom.com`. Los 2 admins son `arodriguez31` y `rsanchez10`.

---

## Comandos útiles

```bash
# Arrancar todo (raíz del proyecto) — pnpm workspaces
pnpm dev

# Solo backend — http://localhost:3001
pnpm --filter ./backend dev

# Solo frontend — http://localhost:5173
pnpm --filter ./frontend dev

# Matar procesos zombie de Node (Windows)
taskkill /F /IM node.exe

# Verificar conexión con ADO
curl http://localhost:3001/api/health
```

---

## Estado actual de implementación

- ✅ **Fase 1 completa**: Board por usuario (swimlanes), filtros por sprint/tipo/usuario/búsqueda, panel de detalle.
- 🔲 **Fase 2 pendiente**: CRUD de work items, formulario de creación, vista Lista.
- 🔲 **Fase 3 pendiente**: Comentarios, historial de cambios.
- 🔲 **Fase 4 pendiente**: Azure AD OAuth (MSAL).

---

## Variables de entorno requeridas (backend/.env)

```
PAT_TOKEN=<token de dev.azure.com → User Settings → Personal access tokens>
ADO_ORG=itsinfocom
ADO_PROJECT=DESARROLLO%20TECNOLOGICO
ADO_PROJECT_NAME=DESARROLLO TECNOLOGICO
ADO_TEAM=DESARROLLO%20TECNOLOGICO%20Team
ADO_TEAM_ID=3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3
PORT=3001
```

> ⚠️ El archivo `.env` NUNCA se commitea. Está en `.gitignore`.
