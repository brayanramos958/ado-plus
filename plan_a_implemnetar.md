# ADO Plus - Plan de Escalabilidad (Plan a Implementar)

Este plan aborda directamente las deficiencias arquitectónicas actuales que impiden a ADO Plus escalar a un volumen alto de tareas, épicas y múltiples usuarios concurrentes. 

## User Review Required

> [!IMPORTANT]
> **Fase 4 (Multi-tenant):** La implementación de JWT y base de datos SQLite (Fase 4) cambiará significativamente el flujo de inicio de la aplicación. Se requerirá que cada usuario ingrese su propio PAT la primera vez que inicie sesión. ¿Estás de acuerdo con dividir esto en fases y empezar primero con las Fases 1 a 3 (que son estrictamente de frontend y red)?

## Proposed Changes

### Fase 1: Chunking de Batch (Crítico para red)

Actualmente `getWorkItemsBatch` envía todos los IDs de una vez, lo cual falla si hay más de 200 debido al límite de la API de ADO.

#### [MODIFY] `frontend/src/api/client.ts`
- Modificar `getWorkItemsBatch(ids: number[])` para dividir el array `ids` en bloques de 200.
- Ejecutar las peticiones en paralelo usando `Promise.all`.
- Concatenar y retornar el array resultante `value` para que la UI no note la diferencia.

### Fase 2: Performance de UI (Rendering a gran escala)

Con cientos de tareas, `SprintBoard` y `WorkItemCard` causan lag porque recalculan y re-renderizan todo.

#### [MODIFY] `frontend/src/components/SprintBoard.tsx`
- Envolver `filteredItems`, `groupedByUser` y conteos derivados dentro de `useMemo` con sus dependencias correctas (`[workItems, filterType, filterAssigned, searchQuery]`).
- Esto evita el recálculo síncrono pesado en cada tipeo del input de búsqueda.

#### [MODIFY] `frontend/src/components/WorkItemCard.tsx`
- Envolver el componente en `React.memo`.
- Asegurar que todas las funciones callback pasadas como props desde `SprintBoardTable` o swimlanes estén envueltas en `useCallback` para no romper la memoización.

### Fase 3: Lazy Loading de Épicas (Metadatos masivos)

Cargar todas las épicas de golpe bloquea el modal `WorkItemQuickEdit`.

#### [MODIFY] `frontend/src/api/client.ts`
- Agregar parámetro opcional `searchQuery?: string` a `getEpics()`.
- Modificar el WIQL para incluir `AND [System.Title] CONTAINS '${searchQuery}'` si se provee.

#### [MODIFY] `frontend/src/hooks/useWorkItems.ts`
- Modificar `useEpics` para aceptar un string de búsqueda reactivo con debounce.

#### [MODIFY] `frontend/src/components/WorkItemQuickEdit.tsx`
- Cambiar el `<Select>` de épicas por un componente tipo Autocomplete/Combobox asíncrono que envíe el texto al hook `useEpics` con un debounce de 300ms.

---

### Fase 4 (Futura): Arquitectura Multi-Tenant (Seguridad)

Implementar un sistema donde cada usuario use su propio PAT de ADO, encriptado en una base de datos local SQLite.

#### [NEW] `backend/src/db.ts`
- Inicialización de `better-sqlite3`.
- Tabla `users` y helpers criptográficos (`encryptPAT`, `decryptPAT`) usando `aes-256-cbc`.

#### [NEW] `backend/src/routes/auth.ts`
- Rutas para `POST /register`, `POST /login` y `POST /pat`.

#### [MODIFY] `backend/src/proxy.ts`
- `adoFetch` debe recibir el token dinámico de `req.user` extraído por un middleware, en lugar del `PAT_TOKEN` global.

#### [NEW] `frontend/src/context/AuthContext.tsx`
- Proveedor de estado JWT y rutinas de login/logout.

## Verification Plan

### Automated Tests
- Compilar el proyecto con `pnpm --filter ./frontend tsc --noEmit` para asegurar que los cambios de tipos en `useEpics` y `getWorkItemsBatch` no rompan TypeScript.

### Manual Verification
1. **Chunking**: Forzar la carga de un sprint de prueba en ADO con más de 201 tareas y verificar que cargue sin error 400.
2. **Performance**: Abrir la pestaña *Performance* de React DevTools, escribir rápido en la barra de búsqueda y validar que las `WorkItemCard` que no cambian no se re-rendericen.
3. **Lazy Epics**: Escribir en el nuevo buscador de épicas de QuickEdit, mirar la pestaña *Network* del navegador y confirmar que la request WIQL solo viaja al detenerse de escribir (debounce) y retorna resultados filtrados.
