# ADO Plus

Aplicación web interna que reemplaza la UI de Azure DevOps con una interfaz más clara y eficiente, similar a Jira o ClickUp.

![Login](docs/screenshots/login.png)

## 🚀 Inicio rápido

### Prerrequisitos
- Node.js 18+
- pnpm 8+
- Personal Access Token (PAT) de Azure DevOps con permisos de Work Items y Project & Team

### Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/brayanramos958/ado-plus.git
cd ado-plus
```

2. Instala dependencias:
```bash
pnpm install
```

3. Configura el archivo de entorno:
```bash
cp .env.example backend/.env
```

4. Edita `backend/.env` con tu token de Azure DevOps:
```bash
PAT_TOKEN=tu_token_de_azure_devops
ADO_ORG=itsinfocom
ADO_PROJECT=DESARROLLO%20TECNOLOGICO
ADO_PROJECT_NAME=DESARROLLO TECNOLOGICO
ADO_TEAM=DESARROLLO%20TECNOLOGICO%20Team
ADO_TEAM_ID=3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3
PORT=3001
```

5. Inicia la aplicación:
```bash
pnpm dev
```

Esto iniciará:
- **Backend (proxy)**: http://localhost:3001
- **Frontend (React)**: http://localhost:5173

## ✅ Funcionalidades

- **Sistema de autenticación multi-usuario**: Registro, login, y gestión de PAT por usuario
- **Board de equipo**: Vista swimlane con todos los miembros del equipo y sus tareas
- **Vista detallada por usuario**: Filtra y ve las tareas asignadas a cada miembro
- **Gestión de sprints**: Selector de sprint con sprints disponibles en ADO
- **Detalle de work items**: Panel lateral con información completa, comentarios y edición rápida
- **Drag & drop**: Mueve tareas entre estados directamente
- **Sistema de horas**: Registro de horas al cambiar estado (En proceso → Resuelto/Cerrado)

## 🏗️ Arquitectura

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

## 📁 Estructura del proyecto

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
└── package.json            # Scripts compartidos
```

## 🛠️ Comandos

```bash
# Desarrollo - levanta todo (backend + frontend)
pnpm dev

# Solo backend
pnpm --filter ./backend dev

# Solo frontend
pnpm --filter ./frontend dev

# Producción
pnpm --filter ./backend build   # Compila backend
pnpm --filter ./frontend build  # Compila frontend
```

## 🔧 Configuración

### Variables de entorno (backend/.env)

```bash
PAT_TOKEN=<tu_personal_access_token>
ADO_ORG=itsinfocom
ADO_PROJECT=DESARROLLO%20TECNOLOGICO
ADO_PROJECT_NAME=DESARROLLO TECNOLOGICO
ADO_TEAM=DESARROLLO%20TECNOLOGICO%20Team
ADO_TEAM_ID=3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3
PORT=3001
```

> **Nota**: Al iniciar por primera vez, el backend genera automáticamente `JWT_SECRET` y `ENCRYPTION_KEY`. Solo `PAT_TOKEN` es obligatorio.

### Equipo Azure DevOps
- **Organización**: `itsinfocom`
- **Proyecto**: `DESARROLLO TECNOLOGICO`
- **Team**: `DESARROLLO TECNOLOGICO Team`

## 📊 Stack técnico

- **Monorepo**: pnpm workspaces
- **Frontend**: React 19 + Vite + TypeScript
- **Estado**: Zustand (UI) + TanStack Query (servidor)
- **UI**: Base UI + Tailwind CSS v4
- **Backend**: Express.js (proxy hacia ADO API)
- **Base de datos**: SQLite (autenticación)
- **Seguridad**: JWT, AES-256-CBC para PAT encriptado

## 🐛 Solución de problemas

### Error 401 Unauthorized
- Verifica que el PAT_TOKEN en `backend/.env` sea válido
- Asegúrate de que el token tenga permisos de Work Items y Project & Team
- El token podría haber expirado (renuévalo en Azure DevOps)

### Error 401 después de login (PAT expirado)
- El usuario debe actualizar su PAT desde la interfaz (Header → Actualizar PAT)
- El sistema detecta cuando el PAT expira y requiere uno nuevo

### Puerto ocupado
- Si el puerto 3001 está ocupado: mata el proceso o cambia PORT en `.env`
- Si el puerto 5173 está ocupado: Vite usará el siguiente disponible automáticamente

### En Windows: proceso Node zombie
```bash
taskkill /F /IM node.exe
```

## 📝 Notas

- El backend es un proxy delgado que inyecta autenticación
- Azure DevOps es la fuente de verdad - no hay base de datos propia para work items
- Multi-asignación se implementa vía tags con prefijo `assignee:`