# Manual de Usuario — ADO Plus

Interfaz web para gestionar las tareas del sprint en Azure DevOps. Diseñada para el equipo itsinfocom: más clara, más rápida y con información siempre visible.

---

## ¿Qué es ADO Plus?

Es tu tablero de sprint personalizado. Reemplaza la interfaz nativa de Azure DevOps por algo hecho a la medida del equipo:

- **Un tablero con swimlanes**: las filas son tus compañeros de equipo, las columnas son los estados de las tareas. Ves todo el sprint de un vistazo.
- **Crear y editar tareas** sin abrir Azure DevOps.
- **Tareas huérfanas**: detecta automáticamente qué tareas no tienen sprint asignado o no están vinculadas a una épica/feature.

> El PAT (token de Azure DevOps) se guarda en el servidor, no en tu navegador. Nadie más puede ver tus credenciales.

---

## Primeros pasos

### 1. Iniciar sesión

1. Abrí la app en tu navegador.
2. Si no tenés cuenta, hacé clic en **Crear cuenta**. Necesitás tu email corporativo (`tu@itsinfocom.com`).
3. Si ya tenés cuenta, ingresá tu email y contraseña.
4. Si es la primera vez que usás la app, la app te va a pedir tu **API Key (PAT)** de Azure DevOps.

### 2. Configurar tu PAT (solo primera vez)

El PAT es un token que permite a la app leer y escribir tareas en tu nombre. Lo generás una vez y queda guardado encriptado.

**Pasos:**

1. Hacé clic en el mensaje que dice _"Ingresá tu nuevo Personal Access Token de Azure DevOps"_ o en el ícono de llave en el header (`🔑`).
2. Abrí este enlace en otra pestaña: [Crear API Key en Azure DevOps](https://dev.azure.com/itsinfocom/_usersSettings/tokens).
3. Hacé clic en **New Token**.
4. Configurá:
   - **Name**: `ADO Plus`
   - **Expiration**: la que prefieras (30 días mínimo recomendado)
   - **Scopes**: marcá estos tres:
     - `Work Items → Read, write, & manage`
     - `Project and Team → Read, write, & manage`
     - `Identity → Read`
5. Copiá el token completo y pegalo en el campo de la app.
6. Hacé clic en **Verificar y guardar**.

> Si el token expira, la app te mostrará un aviso y podrás actualizarlo desde el header (ícono de llave `🔑`).

---

## El Tablero de Sprint

Al iniciar sesión ves el tablero del sprint actual. Todo el equipo está visible.

### Vista de equipo (swimlanes)

La vista por defecto muestra una grilla con todos los integrantes del equipo:

| Fila | Descripción |
|------|-------------|
| **Nombre del integrante** | Avatar con iniciales + cantidad de tareas por estado |
| **Tarjetas de tareas** | Cada tarjeta muestra: título, estado, prioridad, esfuerzo |

**Cómo leer una tarjeta:**

- `#ID` — número de la tarea en Azure DevOps
- **Dot de color** — prioridad (rojo=P4 Crítica, naranja=P3 Alta, amarillo=P2 Media)
- **`Xh`** — horas estimadas
- **Flechas `← →`** — para avanzar o retroceder el estado directamente

```
┌─────────────────────────────────┐
│ ● #647  [Tarea]           ✏   │
│ Título de la tarea breve...     │
│ 👤 Nombre · En proceso  ▶ ■    │
│                     8h         │
└─────────────────────────────────┘
```

### Filtrar por usuario

1. Hacé clic en la tarjeta de cualquier integrante.
2. El tablero cambia a la vista de ese usuario: ve su nombre, sus tareas organizadas por estado.
3. Para volver a la vista de equipo, hacé clic en **Volver al equipo** (izquierda arriba).

### Cambiar el sprint

1. En la barra de filtros, hacé clic en el selector de **Sprint**.
2. Seleccioná el sprint que necesites.
3. El tablero se actualiza con las tareas de ese sprint.

> El badge **"Actual"** marca el sprint que está activo en este momento.

### Buscar tareas

En la barra de filtros, escribí en el campo **Buscar**. Busca por título o número de tarea (`#647`).

Para limpiar la búsqueda, hacé clic en la `✕` junto al campo.

---

## Trabajar con Tareas

### Ver detalle de una tarea

Hacé clic en cualquier tarjeta. Se abre el modal de detalle con:

- **Descripción completa** de la tarea
- **Jerarquía**: Épica → Feature → Task
- **Responsable, prioridad, sprint, esfuerzo, fechas**
- **Hilo de actividad**: comentarios del equipo
- Botón **Abrir en ADO** para ver la tarea en Azure DevOps nativo

Podés publicar comentarios desde ahí. Se guardan directamente en Azure DevOps.

### Crear una nueva tarea

1. Hacé clic en **+ Nueva Tarea** (header derecho).
2. Completá los campos obligatorios (marcados con `*`):
   - **Título** de la tarea
   - **Responsable** — buscá por nombre
   - **Épica** → luego **Feature** — seleccioná la jerarquía correcta
   - **Esfuerzo estimado (horas)** *
3. Los campos opcionales incluyen: descripción, sprint, prioridad, etiquetas, fechas.
4. Hacé clic en **Crear Task** o **Crear Bug**.

> Las tareas se crean en Azure DevOps al instante. No hay paso extra.

### Editar una tarea existente

1. En la tarjeta, hacé clic en el botón **lápiz** (`✏`).
2. Se abre el modal de edición rápida. Podés cambiar:
   - Título, descripción, estado, responsable
   - Sprint, épica, feature, etiquetas
   - Prioridad, esfuerzo estimado, horas registradas
   - Fechas de inicio y fin
3. Hacé clic en **Guardar cambios**.

### Mover una tarea de estado (drag & drop)

1. Arrastrá la tarjeta desde cualquier celda.
2. Soltá sobre la columna del nuevo estado.
3. Si movés desde **"En proceso"** a **Bloqueado**, **Resuelto** o **Cerrado**, la app te pide registrar las horas reales trabajadas.

**También podés usar las flechas** en la tarjeta para avanzar o retroceder un estado sin arrastrar.

### Registrar horas al cerrar una tarea

Cuando movés una tarea desde "En proceso" a otro estado:

1. Aparece un diálogo que pide las **horas reales** registradas.
2. El campo ya viene pre-llenado con el estimado (esfuerzo).
3. Opciones:
   - **Confirmar**: guarda las horas y cambia el estado.
   - **Omitir**: cambia el estado sin registrar horas.

---

## Tareas Huérfanas

Son tareas que no están bien vinculadas dentro de la estructura del equipo.

La vista aparece cuando filtrás por un usuario y hacés clic en el botón **Tareas huérfanas**.

### Dos tipos de huérfanas:

| Tipo | Qué significa | Cómo resolverlo |
|------|---------------|-----------------|
| **Sin sprint** | La tarea no está asignada a ningún sprint | Asignala desde el dropdown "Mover a sprint…" |
| **Sin épica/feature** | La tarea no tiene padre en la jerarquía | Seleccioná una épica, luego un feature, y asigná |

### ¿Cuándo usar esta vista?

- Al empezar el sprint: verificá que todas las tareas tengan sprint y padre.
- Durante el sprint: encontrá tareas que se hayan desvinculado sin querer.
- Al cerrar el sprint: revisá que no quede nada huérfano.

### Asignar sprint a una tarea huérfana

1. En la pestaña **Sin sprint**, hacé clic en el dropdown debajo de la tarjeta.
2. Seleccioná el sprint destino.
3. La tarea desaparece de la vista huérfana y aparece en el board del sprint.

### Asignar padre a una tarea huérfana

1. En la pestaña **Sin épica/feature**, seleccioná la **épica** del dropdown.
2. Aparecerá un segundo dropdown para seleccionar el **feature**.
3. Opcionalmente, hacé clic en **"Asignar a esta épica"** si querés que sea hijo directo de la épica (sin feature intermedio).
4. La tarea desaparece de la vista huérfana.

---

## Gestionar tu Cuenta

### Cambiar contraseña

1. Hacé clic en el ícono de llave `🔑` en el header.
2. Seleccioná la pestaña **Cambiar contraseña**.
3. Ingresá tu contraseña actual, la nueva contraseña (mínimo 8 caracteres), y confirmá la nueva.
4. Hacé clic en **Actualizar**.

### Actualizar tu API Key (PAT)

1. Hacé clic en el ícono de llave `🔑` en el header.
2. Ingresá el nuevo token en el campo.
3. Hacé clic en **Verificar y guardar**.

> Si el token se venció, la app te avisa automáticamente apenas intentás cualquier acción.

### Cerrar sesión

Hacé clic en el ícono de salir en el header derecho (`↩`). Serás redirigido a la pantalla de login.

---

## Solución de Problemas

| Problema | Causa más común | Solución |
|----------|-----------------|----------|
| **El tablero no carga** | El token PAT expiró | Actualizá el PAT desde el ícono de llave `🔑` |
| **Error "Conectado" en rojo** | Sin conexión a internet o ADO caído | Verificá tu conexión; probá abrir dev.azure.com |
| **No puedo crear tarea** | Falta algún campo obligatorio | Revisá que estén: título, responsable, épica, feature, esfuerzo |
| **La tarea se movió sola** | Alguien más la actualizó en ADO | El board se refresca cada 30 segundos automáticamente |
| **No encuentro una tarea** | Está en otro sprint | Cambiá el sprint con el selector en la barra de filtros |
| **El modal de detalle no abre** | La tarea fue eliminada en ADO | Refrescá el board con el botón de actualizar |
| **Las horas no se registran** | No usaste el flujo desde "En proceso" | Solo al salir de "En proceso" la app pide registrar horas |

### Otros problemas

Si tenés un error que no figura en la tabla, probá:

1. Cerrar y volver a abrir la sesión (logout + login).
2. Refrescar el navegador (`F5` o `Ctrl+R`).
3. Si el error persiste, avisale al equipo de desarrollo con una captura del error.