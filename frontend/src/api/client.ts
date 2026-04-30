// API client — wrapper around fetch
// point to Vite proxy → backend

const API_BASE = '/api'

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

// ============================================
// Health
// ============================================

export interface HealthResponse {
  status: string
  org: string
  project: string
}

export function getHealth() {
  return request<HealthResponse>('/health')
}

// ============================================
// Iterations / Sprints
// ============================================

export interface Iteration {
  id: string
  name: string
  path: string
  attributes: {
    startDate: string
    finishDate: string
    timeFrame: 'current' | 'future' | 'past'
  }
}

export function getIterations() {
  return request<{ value: Iteration[] }>('/iterations')
}

// ============================================
// Members / Equipo
// ============================================

export interface Member {
  email: string
  displayName: string
  avatar?: string
  isAdmin: boolean
}

export function getMembers() {
  return request<{ value: Member[] }>('/members')
}

export interface ADOTag {
  id: string
  name: string
  active: boolean
}

export function getTags() {
  return request<{ value: ADOTag[]; count: number }>('/members/wit/tags')
}

// ============================================
// Work Items via WIQL
// ============================================

export interface WorkItemField {
  'System.Id': number
  'System.Title': string
  'System.State': string
  'System.WorkItemType': string
  'System.AssignedTo': string | null
  'System.IterationPath': string
  'System.Tags': string
  'System.CreatedDate': string
  'System.ChangedDate': string
  'System.CreatedBy': string
  'System.Rev': number
  // Custom fields (Task)
  'Custom.FechaInicio'?: string
  'Custom.FechaFin'?: string
  'Custom.TipoHistoriaTecnica'?: string
  // Scheduling fields
  'Microsoft.VSTS.Scheduling.StoryPoints'?: number
  'Microsoft.VSTS.Scheduling.Effort'?: number
  'Microsoft.VSTS.Scheduling.OriginalEstimate'?: number
  'Microsoft.VSTS.Scheduling.CompletedWork'?: number
  'Microsoft.VSTS.Scheduling.RemainingWork'?: number
  // Extra fields used by WorkItemModal
  'System.Description'?: string
  'System.History'?: string
  'System.Parent'?: number
}

export interface WorkItem {
  id: number
  rev: number
  url: string
  fields: WorkItemField
  relations?: Array<{ rel: string; url: string; attributes?: Record<string, unknown> }>
}

// Query work items by sprint and optional type filter
export interface WorkItemsFilter {
  sprintPath: string
  workItemType?: string
}

export function queryWorkItems(filter: WorkItemsFilter) {
  const { sprintPath } = filter

  // WIQL query - usar el path exacto del sprint
  const wiql = {
    query: `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.TeamProject] = 'DESARROLLO TECNOLOGICO'
        AND [System.WorkItemType] IN ('Task', 'Bug')
        AND [System.IterationPath] UNDER '${sprintPath}'
      ORDER BY [System.ChangedDate] DESC
    `,
  }

  // First query: get IDs
  return request<WIQLResponse>('/wiql', {
    method: 'POST',
    body: JSON.stringify(wiql),
  })
}

interface WIQLResponse {
  workItems: { id: number }[]
}

// Get work items details by IDs
export interface WorkItemsBatchRequest {
  ids: number[]
  fields: string[]
}

export function getWorkItemsBatch(ids: number[]) {
  if (ids.length === 0) {
    return Promise.resolve({ value: [] })
  }

  const body = {
    ids,
    $expand: 'all'
  }

  return request<{ value: WorkItem[] }>('/workitems/batch', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getWorkItemDetails(id: number) {
  return request<WorkItem>(`/workitems/${id}`)
}

export interface WorkItemComment {
  id: number
  text: string
  createdDate: string
  createdBy: {
    displayName: string
    url?: string
    imageUrl?: string
  }
}

export function getWorkItemComments(id: number) {
  return request<{ count: number; comments?: WorkItemComment[]; value?: WorkItemComment[] }>(`/workitems/${id}/comments`)
}

// ============================================
// Epics y Features (jerarquía)
// ============================================

export interface WorkItemRef {
  id: number
  title: string
  state: string
}

interface SimpleWorkItemBatch {
  value: Array<{
    id: number
    fields: { 'System.Id': number; 'System.Title': string; 'System.State': string }
  }>
}

export async function getEpics(): Promise<{ value: WorkItemRef[] }> {
  const wiql = {
    query: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Epic' ORDER BY [System.Title] ASC",
  }
  const idsResult = await request<WIQLResponse>('/wiql', { method: 'POST', body: JSON.stringify(wiql) })
  const ids = idsResult.workItems.map((w) => w.id)
  if (ids.length === 0) return { value: [] }

  const result = await request<SimpleWorkItemBatch>('/workitems/batch', {
    method: 'POST',
    body: JSON.stringify({ ids: ids.slice(0, 200), fields: ['System.Id', 'System.Title', 'System.State'] }),
  })
  return {
    value: result.value
      .map((item) => ({ id: item.fields['System.Id'], title: item.fields['System.Title'], state: item.fields['System.State'] }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  }
}

export async function getFeaturesByEpic(epicId?: number): Promise<{ value: WorkItemRef[] }> {
  const epicFilter = epicId ? `AND [System.Parent] = ${epicId}` : ''
  const wiql = {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' ${epicFilter} ORDER BY [System.Title] ASC`,
  }
  const idsResult = await request<WIQLResponse>('/wiql', { method: 'POST', body: JSON.stringify(wiql) })
  const ids = idsResult.workItems.map((w) => w.id)
  if (ids.length === 0) return { value: [] }

  const allItems: WorkItemRef[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const result = await request<SimpleWorkItemBatch>('/workitems/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: chunk, fields: ['System.Id', 'System.Title', 'System.State'] }),
    })
    allItems.push(
      ...result.value.map((item) => ({
        id: item.fields['System.Id'],
        title: item.fields['System.Title'],
        state: item.fields['System.State'],
      }))
    )
  }
  return { value: allItems.sort((a, b) => a.title.localeCompare(b.title)) }
}

// ============================================
// Mutations
// ============================================

export interface PatchOperation {
  op: 'add' | 'replace' | 'remove'
  path: string
  value?: string | number | Record<string, unknown>
}

export function updateWorkItem(id: number, patches: PatchOperation[]) {
  return request(`/workitems/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patches),
  })
}

export interface CreateWorkItemData {
  type: string
  title: string
  state?: string
  assignedTo?: string
  iterationPath?: string
  parentId?: number
  tags?: string        // semicolon-separated, e.g. "frontend; backend"
  effortPoints?: number
}

export function createWorkItem(data: CreateWorkItemData) {
  const { type, title, state, assignedTo, iterationPath, parentId, tags, effortPoints } = data

  const patches: PatchOperation[] = [
    { op: 'add', path: '/fields/System.Title', value: title },
  ]

  if (state) {
    patches.push({ op: 'add', path: '/fields/System.State', value: state })
  }

  if (assignedTo) {
    patches.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo })
  }

  if (iterationPath) {
    patches.push({ op: 'add', path: '/fields/System.IterationPath', value: iterationPath })
  }

  if (tags) {
    patches.push({ op: 'add', path: '/fields/System.Tags', value: tags })
  }

  if (effortPoints !== undefined && effortPoints > 0) {
    patches.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: effortPoints })
  }

  return request(`/workitems`, {
    method: 'POST',
    body: JSON.stringify({ type, patches, parentId }),
  })
}

export function deleteWorkItem(id: number) {
  return request(`/workitems/${id}`, {
    method: 'DELETE',
  })
}