# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADO Plus is a custom frontend for Azure DevOps (ADO) — a sprint board with a swimlane view by user. It consists of two separate packages: a lightweight Express proxy (`backend/`) and a React SPA (`frontend/`). Both must run concurrently during development.

## Commands

### Backend (`ado-plus/backend/`)
```bash
npm run dev      # nodemon + ts-node (hot reload)
npm run build    # tsc → dist/
npm start        # node dist/index.js
```

### Frontend (`ado-plus/frontend/`)
```bash
npm run dev      # vite dev server on :5173
npm run build    # tsc + vite build
```

There are no test commands — this project has no test suite.

TypeScript check (both packages):
```bash
npx tsc --noEmit
```

## Architecture

### Request flow
```
Browser → Vite proxy (/api → :3001) → Express backend → ADO REST API v7.0
```

The backend is a **pure proxy** — it adds the PAT auth header, appends `api-version=7.0` automatically (unless the path already has a version), and normalizes 401 responses. It contains no business logic. All transformation happens in the frontend.

### Backend (`backend/src/`)
- `config.ts` — env vars + ADO constants. Required: `PAT_TOKEN`. Optional defaults: org `itsinfocom`, project `DESARROLLO TECNOLOGICO`.
- `proxy.ts` — `adoFetch()` wrapper used by all routes. Handles auth, content-type, and version injection.
- `routes/wiql.ts` — `POST /api/wiql` — executes raw WIQL queries.
- `routes/workitems.ts` — full CRUD: batch fetch, get by ID, create (with parent relation), patch, delete, comments.
- `routes/iterations.ts` — sprint list + current sprint (filtered by `ADO_TEAM_ID`).
- `routes/members.ts` — team members normalized to `{ email, displayName, avatar, isAdmin }`. Also exposes `/wit/types` and `/wit/states/:type`.

### Frontend (`frontend/src/`)

**Data layer** (no component logic here):
- `api/client.ts` — typed fetch wrappers. All calls go to `/api/*` (proxied). WIQL + batch is the pattern for fetching work items (query IDs, then batch-fetch fields).
- `hooks/useWorkItems.ts` — TanStack Query hooks. Server state only. Mutations invalidate `['workitems']`.
- `store/boardStore.ts` — Zustand. UI state only: active sprint path, filters, view mode, open modals, selected work item.
- `types/index.ts` — all shared types. `WorkItemUI` is the normalized UI model (parsed from ADO's raw `WorkItemField`). `AssignedTo` comes from ADO as an object `{ uniqueName, displayName }` — always extract `uniqueName` as email.

**Components:**
- `SprintBoard.tsx` — two views controlled by `filterAssigned` in store: `UserSelectionGrid` (no filter = show all users as cards) and `SprintBoardTable` (filter active = swimlane for that user).
- `WorkItemModal.tsx` — read-only detail modal. Fetches full hierarchy (task → feature → epic) and comments lazily on open.
- `CreateTaskModal.tsx` — create form. Supports: type, title, state, effort points (`Microsoft.VSTS.Scheduling.StoryPoints`), tags (`System.Tags` as `;`-separated string), assignee, sprint, epic/feature hierarchy.
- `WorkItemQuickEdit.tsx` — inline edit modal.

**UI primitives** (`components/ui/`):
- Dialog is from `@base-ui/react` (not Radix). Key behavioral difference: use `disablePointerDismissal` on `<Dialog>` root to prevent closing on outside click. Do NOT use `onInteractOutside`.
- `DialogContent` base styles have NO `sm:max-w-*` constraint — callers set their own `max-w-*`. Pass both `max-w-*` AND `sm:max-w-*` if you want consistent width across breakpoints (without `sm:max-w-*`, Tailwind base utilities can be overridden by responsive variants).
- Path alias `@/` resolves to `frontend/src/`.

## Key Conventions

**Work item fetch pattern** — always two-step:
1. `POST /api/wiql` → get IDs
2. `POST /api/workitems/batch` with `$expand: 'all'` → get fields

Never fetch individual work items for list views — batch only.

**ADO field quirks:**
- `System.AssignedTo` returns an object `{ uniqueName, displayName, imageUrl }`, not a plain string. The `useSprintWorkItems` hook normalizes this.
- Effort lives in whichever of `StoryPoints`, `Effort`, or `OriginalEstimate` is non-null. The hook detects and exposes `effortField` so mutations know which path to PATCH.
- Tags are a `;`-separated string in both directions.

**Proxy path logic** in `adoFetch`:
- Paths starting with `/` are treated as absolute from `ADO_BASE`.
- Paths without `/` prefix get `PROJECT_PATH` prepended.
- `api-version` is auto-appended unless already present.

## Environment Setup

Backend requires a `.env` file in `backend/`:
```
PAT_TOKEN=<Azure DevOps Personal Access Token>
ADO_ORG=itsinfocom              # optional
ADO_PROJECT=DESARROLLO%20TECNOLOGICO  # optional, URL-encoded
ADO_PROJECT_NAME=DESARROLLO TECNOLOGICO  # optional, human-readable
ADO_TEAM=DESARROLLO%20TECNOLOGICO%20Team  # optional
ADO_TEAM_ID=3d8bbe19-d49c-41c4-9fc1-dc810bdef2d3  # optional
PORT=3001  # optional
```

When PAT expires, ADO returns 401. The proxy converts it to `{ error: 'ADO_PAT_EXPIRED' }` — renew at dev.azure.com → User Settings → Personal access tokens.
