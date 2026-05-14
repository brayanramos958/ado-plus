# ADO Plus

Interfaz web interna que reemplaza la UI nativa de Azure DevOps para el equipo `itsinfocom`.

![Login](docs/screenshots/login.png)

## Características

- **Sistema de autenticación multi-usuario**: Registro, login, y gestión de PAT por usuario
- **Board de equipo**: Vista swimlane con todos los miembros del equipo y sus tareas
- **Vista detallada por usuario**: Filtra y ve las tareas asignadas a cada miembro
- **Gestión de sprints**: Selector de sprint con sprints disponibles en ADO
- **Detalle de work items**: Panel lateral con información completa, comentarios y edición rápida

## Tecnologías

- **Monorepo**: pnpm workspaces
- **Frontend**: React 19 + Vite + TypeScript
- **Estado**: Zustand (UI) + TanStack Query (servidor)
- **UI**: Base UI + Tailwind CSS v4
- **Backend**: Express.js (proxy hacia ADO API)
- **Base de datos**: SQLite (autenticación)
- **Seguridad**: JWT, AES-256-CBC para PAT encriptado

## Requisitos

- Node.js 18+
- pnpm 8+
- Windows o Linux

## Configuración

### 1. Clonar y instalar dependencias

```bash
git clone https://github.com/brayanramos958/ado-plus.git
cd ado-plus
pnpm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y completa con tus datos:

```bash
cp .env.example backend/.env
```

Edita `backend/.env` con tu token de Azure DevOps:

```bash
PAT_TOKEN=tu_token_de_azure_devops
ADO_ORG=tu_organizacion
ADO_PROJECT=tu_proyecto_url_encoded
ADO_PROJECT_NAME=tu_proyecto
ADO_TEAM=tu_team_url_encoded
ADO_TEAM_ID=tu_team_id
PORT=3001
```

### 3. Generar secrets (automático)

Al iniciar por primera vez, el backend genera automáticamente:
- `JWT_SECRET` - Para firmar tokens JWT
- `ENCRYPTION_KEY` - Para encriptar PAT en la base de datos

Solo `PAT_TOKEN` es obligatorio en el `.env`.

## Ejecución

```bash
# Un solo comando - levanta backend + frontend juntos
pnpm dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

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
Express backend (:3001)
  ↓ + Authorization: Basic <PAT>
Azure DevOps REST API v7.0
```

- El PAT nunca llega al browser - el backend lo inyecta en todas las requests
- Cada usuario tiene su propio PAT encriptado en la base de datos SQLite
- El PAT global de `.env` sirve como fallback

## Estructura del proyecto

```
ado-plus/
├── backend/                  # Express proxy hacia ADO API
│   └── src/
│       ├── auth/             # Middleware JWT, rate limiter, validators
│       ├── routes/           # Rutas API (auth, workitems, iterations, members)
│       ├── config.ts         # Configuración y secrets
│       ├── db.ts            # SQLite con mejor-sqlite3
│       ├── index.ts         # Entry point
│       └── proxy.ts         # Proxy handler hacia ADO
├── frontend/                 # React app
│   └── src/
│       ├── api/             # Cliente API y queries TanStack
│       ├── components/      # Componentes UI
│       ├── context/         # AuthContext
│       ├── hooks/          # Custom hooks (useWorkItems, etc.)
│       ├── pages/          # Pages (LoginPage, SprintPage)
│       └── stores/         # Zustand stores
├── docs/                     # Documentación y screenshots
│   └── screenshots/
├── pnpm-workspace.yaml      # Configuración monorepo
└── package.json             # Scripts compartidos
```