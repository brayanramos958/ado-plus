# Plan — Arreglar 2 errores rojos de `react-doctor`

**Objetivo**: Llevar el score de `react-doctor` de **0/100 → ~56/100** arreglando los 2 únicos issues marcados como errores (no warnings).

**Restricción del usuario**: "asegurate de que nada se dañe" — nada de comportamiento debe cambiar, solo la implementación interna.

**Restricción de git**: NO push sin permiso explícito.

---

## Issues a arreglar

### 🔴 Error 1: `Bugs: State synced to a prop inside an effect` (×24)

**Patrón problemático** (en `CreateTaskModal.tsx` línea 236 y `WorkItemQuickEdit.tsx` líneas 101, 128):

```tsx
// ❌ INCORRECTO — useEffect sincroniza state a prop después del render
useEffect(() => {
  if (isOpen && workItem) {
    setTitle(workItem.title)
    setState(workItem.state)
    setAssignedTo(workItem.assignedTo ?? '')
    // ... 15+ setState calls más
  }
}, [isOpen, workItem])
```

**Por qué es problema**: El usuario ve un frame con valores viejos antes de que el effect corra. React docs lo explican en https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes

**Solución recomendada por React**: usar **`key` prop** en el padre para forzar remontaje cuando cambia el workItem/isOpen. El componente nuevo se monta con `useState(initialValue)` directamente, sin useEffect.

#### Aplicación en `CreateTaskModal`

**Cambio en `SprintPage.tsx`** (línea 129-134, el render del CreateTaskModal):

```tsx
// ANTES
<CreateTaskModal
  isOpen={isCreateModalOpen}
  onClose={() => setCreateModalOpen(false)}
  defaultSprintPath={sprintPath}
  defaultAssignedTo={filterAssigned}
/>

// DESPUÉS — key cambia cuando se abre → se remonta con state limpio
<CreateTaskModal
  key={isCreateModalOpen ? 'open' : 'closed'}
  isOpen={isCreateModalOpen}
  onClose={() => setCreateModalOpen(false)}
  defaultSprintPath={sprintPath}
  defaultAssignedTo={filterAssigned}
/>
```

**Cambio en `CreateTaskModal.tsx`**:
- Eliminar el `useEffect` de líneas 236-255 (16 setState calls)
- Mover la lógica de defaults al inicializador de `useState`:

```tsx
// ANTES
const [sprintPath, setSprintPath] = useState('')
// ...
useEffect(() => {
  if (isOpen) {
    setSprintPath(defaultSprintPath || '')
    // ...
  }
}, [isOpen, defaultSprintPath, defaultAssignedTo])

// DESPUÉS
const [sprintPath, setSprintPath] = useState(defaultSprintPath || '')
// sin useEffect de reset
```

> **Importante**: `defaultSprintPath` y `defaultAssignedTo` vienen del padre. Si cambian mientras el modal está abierto, el state NO se actualiza — pero el padre ya pone `key` que remonta el modal cuando isOpen cambia. Esto es exactamente lo que queremos.

#### Aplicación en `WorkItemQuickEdit`

**Cambio en `SprintPage.tsx`** (línea 184-188):

```tsx
// ANTES
<WorkItemQuickEdit
  workItem={editingWorkItem}
  isOpen={editingWorkItemId != null}
  onClose={() => setEditingWorkItemId(null)}
/>

// DESPUÉS — key cambia cuando cambia el workItem o se abre
<WorkItemQuickEdit
  key={editingWorkItem ? `${editingWorkItem.id}-${editingWorkItemId != null}` : 'closed'}
  workItem={editingWorkItem}
  isOpen={editingWorkItemId != null}
  onClose={() => setEditingWorkItemId(null)}
/>
```

**Cambio en `WorkItemQuickEdit.tsx`**:
- Eliminar el `useEffect` de líneas 101-125 (17 setState calls de sincronización)
- Mover la inicialización al `useState` initializer:

```tsx
// ANTES
const [title, setTitle] = useState('')
const [state, setState] = useState<string>('')
// ...
useEffect(() => {
  if (isOpen && workItem) {
    setTitle(workItem.title)
    setState(workItem.state)
    // ...
  }
}, [isOpen, workItem])

// DESPUÉS
const [title, setTitle] = useState(workItem?.title ?? '')
const [state, setState] = useState<string>(workItem?.state ?? '')
// ... etc
```

#### El `useEffect` de hierarchy (línea 128-138) SE MANTIENE

Este effect inicializa `epicId`/`featureId` desde el resultado async de `useWorkItemHierarchy`. No es "sync a prop" — es **respuesta a una query async**. No es un bug de `react-doctor` (no aparece en su reporte de "sync state to prop"). Se queda.

### 🔴 Error 2: `Security: @types/dompurify supply-chain 38/100`

**Diagnóstico**:
- `@types/dompurify@3.2.0` es la **última versión** del paquete — no se puede bumpear
- El score bajo es del propio paquete (no del proyecto)
- DOMPurify v3.x **incluye sus propios tipos** — el paquete `@types/dompurify` es **obsoleto**

**Solución**: remover `@types/dompurify` de `devDependencies`. `dompurify@^3.4.2` (que ya está en dependencies) provee los tipos.

**Verificación previa**: confirmar que `WorkItemModal.tsx` sigue compilando con `import DOMPurify from 'dompurify'` sin el paquete de tipos.

---

## Plan de implementación

| # | Paso | Archivo | Esfuerzo |
|---|------|---------|----------|
| 1 | Agregar `key` prop al render de `CreateTaskModal` en SprintPage | `SprintPage.tsx` | 1 min |
| 2 | Mover defaults de props a `useState` inicializers en `CreateTaskModal` | `CreateTaskModal.tsx` | 5 min |
| 3 | Eliminar `useEffect` de reset (líneas 236-255) | `CreateTaskModal.tsx` | 1 min |
| 4 | Agregar `key` prop al render de `WorkItemQuickEdit` en SprintPage | `SprintPage.tsx` | 1 min |
| 5 | Mover defaults de `workItem` a `useState` inicializers en `WorkItemQuickEdit` | `WorkItemQuickEdit.tsx` | 5 min |
| 6 | Eliminar `useEffect` de reset (líneas 101-125) | `WorkItemQuickEdit.tsx` | 1 min |
| 7 | Remover `"@types/dompurify"` de `devDependencies` | `package.json` | 30 s |
| 8 | Verificar `tsc --noEmit` (ambos paquetes) | — | 30 s |
| 9 | Verificar `vite build` (frontend) | — | 30 s |
| 10 | Ejecutar `npx react-doctor@latest` para confirmar score | — | 10 s |
| 11 | Commit local (sin push) | — | 10 s |

**Tiempo total estimado**: ~15 minutos.

---

## Smoke test manual (para verificar que nada se dañó)

Después de los cambios, **sin build**, abrir la app y verificar:

1. **CreateTaskModal**:
   - [ ] Click en "+ Nueva Tarea" → modal abre con campos vacíos y sprint default del board
   - [ ] Llenar campos, cerrar con X → reabrir → campos vacíos de nuevo
   - [ ] Llenar campos, guardar → task creada en ADO
   - [ ] Llenar campos, cancelar → al reabrir, campos vacíos

2. **WorkItemQuickEdit** (edición rápida):
   - [ ] Click en lápiz de una tarjeta → modal abre con valores del workItem
   - [ ] Cambiar título, guardar → actualizado en ADO
   - [ ] Click en lápiz de OTRA tarjeta sin cerrar la primera → modal se remonta con valores nuevos
   - [ ] Click en "X" → modal cierra, reabrir misma tarjeta → valores correctos

3. **Hierarchy loading**:
   - [ ] Editar una task con feature padre → el feature aparece cargado después de unos ms (vía hierarchy useEffect)

4. **Verificación TypeScript**:
   - [ ] `npx tsc --noEmit` en `/frontend` → 0 errores
   - [ ] `npx tsc --noEmit` en `/backend` → 0 errores (no se toca pero confirmamos)

5. **Verificación de build**:
   - [ ] `npx vite build` en `/frontend` → 0 errores

6. **Verificación react-doctor**:
   - [ ] `npx react-doctor@latest` → score mejora de 0/100 a ~56/100

---

## Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| `useState(workItem?.title ?? '')` se inicializa con `null` la primera vez | El padre pone `key` que remonta — cuando isOpen=true, workItem ya existe |
| `openCount` (línea 119) ya no se incrementa | Se elimina con el useEffect — verificamos que no se use en otro lado |
| El `key` cambia en cada render de SprintPage | Usar `${editingWorkItem.id}-${editingWorkItemId != null}` (boolean estable por sesión) |
| El usuario abre el modal, escribe algo, el workItem cambia de fondo | El `key` remonta, pierde lo no guardado — comportamiento aceptable (es el actual) |

---

## Commit message (single commit)

```
fix(modal): replace state-syncing useEffect with key-prop for clean remount

- CreateTaskModal: drop 16-call useEffect that synced props to state
  on isOpen. Move defaults into useState initializers. Parent now
  uses `key={isCreateModalOpen ? 'open' : 'closed'}` to force remount.

- WorkItemQuickEdit: drop 17-call useEffect that synced workItem to
  state on isOpen. Move workItem defaults into useState initializers.
  Parent uses `key=${id}-${isOpen}` to remount on workItem change.

- Hierarchy-loading useEffect (epic/feature from async query) is
  preserved — it responds to async data, not prop sync.

- Removes 23 react-doctor "state synced to prop" errors.

chore(deps): drop @types/dompurify (dompurify v3 ships its own types)
```

---

## Lo que NO se hace

- No se reescriben los modales a `useReducer`
- No se arreglan los 162 warnings (maintainability, a11y, performance, bugs)
- No se refactoriza la estructura de los archivos
- No se cambia el patrón de Date input, los otros useEffect, ni nada del comportamiento

**Scope mínimo y quirúrgico**.
