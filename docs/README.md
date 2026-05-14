# ADO Plus

Interfaz web interna que reemplaza la UI nativa de Azure DevOps para el equipo `itsinfocom`.

![Login](docs/screenshots/login.png)

## Características

- **Login con Azure DevOps**: Autenticación mediante Personal Access Token (PAT)
- **Board de equipo**: Vista swimlane con todos los miembros del equipo y sus tareas
- **Vista detallada por usuario**: Filtra y ve las tareas asignadas a cada miembro
- **Gestión de sprints**: Selector de sprint con sprints disponibles en ADO
- **Detalle de work items**: Panel lateral con información completa, comentarios y edición rápida

## Tecnologías

- **Frontend**: React 19 + Vite + TypeScript
- **Estado**: Zustand (UI) + TanStack Query (servidor)
- **UI**: Base UI + Tailwind CSS v4
- **Backend**: Express.js (proxy hacia ADO API)

## Configuración

### Variables de entorno

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

### Ejecución

```bash
# Raíz del proyecto
pnpm dev

# Solo backend (:3001)
pnpm --filter ./backend dev

# Solo frontend (:5173)
pnpm --filter ./frontend dev
```

## Screenshots

### Login

![Login](docs/screenshots/login.png)

### Board de Equipo

![Board de Equipo](docs/screenshots/board-team.png)

### Vista Detallada por Usuario

![Board Detallado](docs/screenshots/board-detail.png)

## Arquitectura

```
Browser (:5173 React)
  ↓ fetch /api/*
Vite proxy transparente
  ↓ redirige a
Express backend (:3001)  ← ÚNICO lugar con el PAT token
  ↓ + Authorization: Basic <PAT>
Azure DevOps REST API v7.0
```

## Estructura del proyecto

```
ado-plus/
├── backend/              # Express proxy hacia ADO API
│   ├── routes/           # Rutas API (workitems, board)
│   ├── api/              # Cliente ADO
│   └── proxy.ts          # Proxy handler
├── frontend/             # React app
│   ├── src/
│   │   ├── components/   # Componentes UI
│   │   ├── stores/       # Zustand stores
│   │   ├── hooks/        # Custom hooks
│   │   └── api/          # Queries TanStack
│   └── public/
├── docs/                 # Documentación y screenshots
│   └── screenshots/
└── AGENTS.md             # Guía para agentes AI
```