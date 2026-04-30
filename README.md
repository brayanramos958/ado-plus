# ADO Plus

Aplicación web interna que reemplaza la UI de Azure DevOps con una interfaz más clara y eficiente, similar a Jira o ClickUp.

## 🚀 Inicio rápido

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Personal Access Token (PAT) de Azure DevOps con permisos de Work Items y Project & Team

### Instalación

1. Clona el repositorio:
```bash
git clone <url-del-repo>
cd ado-plus
```

2. Instala dependencias:
```bash
npm install
```

3. Configura el Personal Access Token:
   - Ve a https://dev.azure.com/itsinfocom → User Settings → Personal access tokens
   - Crea un nuevo token con permisos:
     - Work Items: Read & write
     - Project and Team: Read
   - Copia el token y actualiza `backend/.env`:
   ```bash
   PAT_TOKEN=tu_token_aqui
   ```

4. Inicia los servidores de desarrollo:
```bash
npm run dev
```

Esto iniciará:
- Backend (proxy): http://localhost:3001
- Frontend (React): http://localhost:5173 (o siguiente puerto disponible)

## 📋 Estado actual

### ✅ Funcionalidades implementadas
- **Backend proxy** con autenticación PAT
- **Conexión a Azure DevOps** verificada
- **Endpoints API** funcionando:
  - `/health` - Estado del backend
  - `/api/iterations` - Lista de sprints (18 totales)
  - `/api/iterations/current` - Sprint actual (Q2-ABRIL-2026)
  - `/api/members` - Miembros del equipo (16 personas)
  - `/api/members/wit/types` - Tipos de work items (15 tipos)
  - `/api/members/wit/states/:type` - Estados por tipo
- **Frontend básico** con verificación de conexión

### 🔄 Próximas fases (según PLAN.md)

#### Fase 1 - MVP Board (por implementar)
- Tipos TypeScript completos
- Hooks TanStack Query
- Stores Zustand
- Componentes base (Avatar, Badge, etc.)
- WorkItemCard y KanbanBoard con drag & drop

#### Fase 2 - Filtros y CRUD
- FilterBar con sprint, tipo y asignado
- WorkItemForm con react-hook-form + zod
- Mutaciones para crear/editar/eliminar work items

#### Fase 3 - Detalle completo
- Panel lateral de detalle
- Hilo de comentarios
- Historial de cambios

#### Fase 4 - Autenticación Azure AD (futuro)
- MSAL para autenticación OAuth
- Permisos nativos de ADO por usuario

## 🏗️ Arquitectura

```
Browser
  ↓
Frontend (React + Vite — :5173)
  ↓  /api/*
Backend proxy (Express — :3001)
  ↓  + Authorization: Basic <PAT>
Azure DevOps REST API v7.0
```

## 🛠️ Comandos disponibles

```bash
# Desarrollo
npm run dev              # Inicia backend + frontend
cd backend && npm run dev    # Solo backend
cd frontend && npm run dev   # Solo frontend

# Producción
cd backend && npm run build  # Compila TypeScript
cd backend && npm start      # Inicia servidor compilado
cd frontend && npm run build # Build para producción
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

### Equipo Azure DevOps
- **Organización**: `itsinfocom`
- **Proyecto**: `DESARROLLO TECNOLOGICO`
- **Team**: `DESARROLLO TECNOLOGICO Team`
- **Sprint actual**: Q2-ABRIL-2026 (2026-04-01 al 2026-04-30)

## 📊 Datos verificados

- ✅ 519 work items totales
- ✅ 18 sprints (Q2-ABRIL-2025 a Q4-DICIEMBRE-2026)
- ✅ 16 miembros del equipo
- ✅ Tipos: Task, Bug, Epic, Feature, Issue, User Story (Bug deshabilitado)
- ✅ Estados de Task en español: Por Hacer → Planeado → En proceso → Bloqueado → Resuelto → Cerrado

## 🐛 Solución de problemas

### Error 401 Unauthorized
- Verifica que el PAT_TOKEN en `backend/.env` sea válido
- Asegúrate de que el token tenga permisos de Work Items y Project & Team
- El token podría haber expirado (renuévalo en Azure DevOps)

### Error 404 en endpoints
- Verifica que las rutas en `backend/.env` coincidan con tu organización de ADO
- Confirma que el proyecto y team existan en Azure DevOps

### Puerto ocupado
- Si el puerto 3001 está ocupado: mata el proceso o cambia PORT en .env
- Si el puerto 5173 está ocupado: Vite usará el siguiente disponible automáticamente

## 📝 Notas de desarrollo

- El backend es un proxy delgado que inyecta autenticación
- No hay base de datos propia — Azure DevOps es la fuente de verdad
- La autenticación actual usa PAT global; futuro: Azure AD OAuth
- Multi-asignación se implementa vía tags con prefijo `assignee:`

## 🤝 Contribución

1. Sigue el PLAN.md para las fases de implementación
2. Mantén consistencia con la arquitectura hexagonal
3. Usa TypeScript estrictamente
4. Implementa tests para lógica de negocio
5. Sigue conventional commits