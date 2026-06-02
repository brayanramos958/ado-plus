const API_BASE = '/api'
const AUTH_STORAGE_KEY = 'ado-plus-auth'

/** Error lanzado cuando el PAT de Azure DevOps es inválido/expirado.
 *  Se distingue de un 401 por JWT expirado — no dispara logout. */
export class PATError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PATError'
  }
}

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string }
    return parsed.token ?? null
  } catch {
    return null
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  // Inyectar token JWT si existe
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    const errorBody = await response.json().catch(() => ({ error: 'Sesión expirada' }))

    // Cualquier 401 (PAT inválido o JWT expirado) → logout completo.
    // El usuario vuelve a LoginPage y se le pide la API Key de nuevo.
    localStorage.removeItem(AUTH_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('auth:logout'))

    if (errorBody.error === 'ADO_PAT_EXPIRED' || errorBody.error === 'NO_PAT') {
      throw new PATError(errorBody.message || 'Tu PAT de Azure DevOps no es válido. Iniciá sesión de nuevo para actualizarlo.')
    }

    throw new Error(errorBody.error || 'Sesión expirada — iniciá sesión de nuevo')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.message || `HTTP ${response.status}`)
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
// Members / Team
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
  // Planning
  'Microsoft.VSTS.Common.Priority'?: number
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

  // Sprint path must be exact (e.g. "Team\Q2 2026") — UNDER operator also matches sub-iterations
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

const BATCH_CHUNK_SIZE = 200 // ADO REST API limit per request
const BATCH_FIELDS = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.WorkItemType',
  'System.AssignedTo',
  'System.IterationPath',
  'System.Tags',
  'System.CreatedDate',
  'System.ChangedDate',
  'System.CreatedBy',
  'System.Rev',
  'System.Parent',
  'Custom.FechaInicio',
  'Custom.FechaFin',
  'Microsoft.VSTS.Scheduling.Effort',
  'Microsoft.VSTS.Scheduling.RemainingWork',
  'Microsoft.VSTS.Common.Priority',
]

export function getWorkItemsBatch(ids: number[]) {
  if (ids.length === 0) {
    return Promise.resolve({ value: [] })
  }

  // Split into chunks of 200 (ADO batch limit) and execute in parallel
  const chunks: number[][] = []
  for (let i = 0; i < ids.length; i += BATCH_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + BATCH_CHUNK_SIZE))
  }

  const requests = chunks.map((chunk) =>
    request<{ value: WorkItem[] }>('/workitems/batch', {
      method: 'POST',
      body: JSON.stringify({ ids: chunk, fields: BATCH_FIELDS }),
    })
  )

  return Promise.all(requests).then((results) => ({
    value: results.flatMap((r) => r.value),
  }))
}

// ============================================
// Orphan Item Detection
// ============================================

/** Transform a raw ADO WorkItem into the UI-friendly WorkItemUI format.
 *  Mirrors the transform logic in useSprintWorkItems — kept DRY here for
 *  the unsprint and unparented query functions. */
function transformWorkItemToUI(item: WorkItem): import('../types').WorkItemUI {
  const identity = item.fields['System.AssignedTo'] as string | { uniqueName?: string; displayName?: string } | null
  let assignedTo: string | null = null
  let assignedToName: string | null = null

  if (identity) {
    if (typeof identity === 'string') {
      assignedTo = identity || null
      assignedToName = identity.split('@')[0]
    } else {
      assignedTo = identity.uniqueName ?? null
      assignedToName = identity.displayName ?? null
    }
  }

  return {
    id: item.id,
    title: item.fields['System.Title'],
    type: item.fields['System.WorkItemType'] as import('../types').WorkItemUI['type'],
    state: item.fields['System.State'] as import('../types').WorkItemUI['state'],
    iterationPath: item.fields['System.IterationPath'],
    assignedTo,
    assignedToName,
    tags: item.fields['System.Tags']
      ? item.fields['System.Tags'].split(';').map(t => t.trim()).filter(Boolean)
      : [],
    createdDate: item.fields['System.CreatedDate'],
    changedDate: item.fields['System.ChangedDate'],
    createdBy: item.fields['System.CreatedBy'],
    rev: item.fields['System.Rev'],
    fechaInicio: item.fields['Custom.FechaInicio'],
    fechaFin: item.fields['Custom.FechaFin'],
    effortPoints: item.fields['Microsoft.VSTS.Scheduling.Effort'] ?? undefined,
    effortField: item.fields['Microsoft.VSTS.Scheduling.Effort'] != null
      ? 'Microsoft.VSTS.Scheduling.Effort' as const
      : undefined,
    completedWork: item.fields['Microsoft.VSTS.Scheduling.RemainingWork'] ?? undefined,
    priority: item.fields['Microsoft.VSTS.Common.Priority'] ?? undefined,
    parentId: item.fields['System.Parent'] ?? undefined,
  }
}

/**
 * Fetch Task/Bug items that have no sprint set.
 *
 * Strategy:
 *   1. WIQL: items with no sprint (IterationPath at project root or year level
 *      only — 0 or 1 backslash depth), filtered by displayName (WIQL compares
 *      against the display name stored in System.AssignedTo, NOT the email).
 *   2. If ADO rejects the empty-string comparison, fallback to root-only
 *   3. Batch-fetch full details with getWorkItemsBatch
 *   4. Client-side filter: match by assignedTo email + double-check depth < 2
 *   5. Transform to WorkItemUI[]
 */
export async function queryUnsprintItems(
  email: string,
  displayName?: string | null
): Promise<import('../types').WorkItemUI[]> {
  const escapedName = displayName?.replace(/'/g, "''") ?? ''

  // WIQL: ALL Task/Bug for the user via UNDER — catches every level:
  //   DESARROLLO TECNOLOGICO           (root)
  //   DESARROLLO TECNOLOGICO\2026      (year, no sprint)
  //   DESARROLLO TECNOLOGICO\2026\Q2   (sprint)
  // Client-side depth filter keeps only items with < 2 backslashes.
  const wiql = {
    query: `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.TeamProject] = 'DESARROLLO TECNOLOGICO'
        AND [System.WorkItemType] IN ('Task', 'Bug')
        ${escapedName ? `AND [System.AssignedTo] = '${escapedName}'` : ''}
        AND [System.IterationPath] UNDER 'DESARROLLO TECNOLOGICO'
      ORDER BY [System.ChangedDate] DESC
    `,
  }
  const idsResult = await request<WIQLResponse>('/wiql', {
    method: 'POST',
    body: JSON.stringify(wiql),
  })

  const ids = idsResult.workItems.map(w => w.id)
  if (ids.length === 0) return []

  // Batch-fetch full details
  const batchResult = await getWorkItemsBatch(ids)

  // Client-side: filter by assignedTo email + check iteration depth.
  // ADO IterationPath structure: PROJECT\YEAR\SPRINT (e.g., DESARROLLO TECNOLOGICO\2026\Q2-MAYO-2026)
  // - 0 backslashes = project root only → NO sprint
  // - 1 backslash  = year folder only  → NO sprint (e.g., DESARROLLO TECNOLOGICO\2026)
  // - 2+ backslashes = actual sprint   → HAS sprint
  const projectRoot = 'DESARROLLO TECNOLOGICO'
  const isUnsprint = (ip: string): boolean => {
    if (ip === projectRoot) return true
    if (ip === '') return true
    // Count backslashes to determine hierarchy depth
    const depth = (ip.match(/\\/g) || []).length
    // Less than 2 levels = no actual sprint assigned
    return depth < 2
  }

  const emailLower = email.toLowerCase()

  return batchResult.value
    .filter(item => {
      // ADO returns identity as object { uniqueName, displayName } but
      // the WorkItemField type declares it as string. Cast to any for
      // runtime safety — both shapes exist in the API.
      const identity = item.fields['System.AssignedTo'] as any
      const assignedTo = typeof identity === 'string'
        ? identity
        : identity?.uniqueName ?? null
      return assignedTo?.toLowerCase() === emailLower
    })
    .filter(item => isUnsprint(item.fields['System.IterationPath']))
    .map(item => transformWorkItemToUI(item))
}

/**
 * Detect Task/Bug items that lack an Epic or Feature ancestor in the hierarchy chain.
 *
 * Multi-step algorithm:
 *   1. WIQL: Task/Bug filtered by displayName (WIQL compares against
 *      display name stored in System.AssignedTo, NOT the email) → get IDs
 *   2. Batch-fetch with System.Parent → separate items into "has parent" and "no parent"
 *   3. Items with NO System.Parent → immediately orphaned
 *   4. Batch-fetch the parent work items → check their WorkItemType:
 *      - Epic or Feature parent → item HAS valid hierarchy, NOT orphan
 *      - User Story or other type → item IS orphan
 *   5. For parents that are Features → batch-fetch THEIR parents (Epics):
 *      - Feature WITH Epic parent → item's chain is complete, NOT orphan
 *      - Feature WITHOUT Epic parent → item IS orphan
 *   6. Client-side filter: match by assignedTo email (extra safety)
 *   7. Return orphaned items as WorkItemUI[]
 */
export async function queryUnparentedItems(
  email: string,
  displayName?: string | null
): Promise<import('../types').WorkItemUI[]> {
  const escapedName = displayName?.replace(/'/g, "''") ?? ''

  // Step 1: WIQL — Task/Bug for the specified user (by displayName)
  const wiql = {
    query: `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.TeamProject] = 'DESARROLLO TECNOLOGICO'
        AND [System.WorkItemType] IN ('Task', 'Bug')
        ${escapedName ? `AND [System.AssignedTo] = '${escapedName}'` : ''}
      ORDER BY [System.ChangedDate] DESC
    `,
  }
  const idsResult = await request<WIQLResponse>('/wiql', {
    method: 'POST',
    body: JSON.stringify(wiql),
  })
  const allIds = idsResult.workItems.map(w => w.id)
  if (allIds.length === 0) return []

  // Step 2: Batch-fetch all user items with their System.Parent relation
  const batchResult = await getWorkItemsBatch(allIds)
  const allItems = batchResult.value

  // Step 3: Separate into "has parent" and "no parent"
  const orphansNoParent: WorkItem[] = []
  const parentMap = new Map<number, number[]>() // parentId → [childIds]

  for (const item of allItems) {
    const parentId = item.fields['System.Parent']
    if (!parentId) {
      orphansNoParent.push(item)
    } else {
      const pId = Number(parentId)
      if (!parentMap.has(pId)) parentMap.set(pId, [])
      parentMap.get(pId)!.push(item.id)
    }
  }

  // Collect all unique parent IDs
  const allParentIds = Array.from(parentMap.keys())
  if (allParentIds.length === 0) {
    // Only no-parent orphans
    return orphansNoParent.map(item => transformWorkItemToUI(item))
  }

  // Step 4: Batch-fetch parents to check their WorkItemType
  const parentsResult = await getWorkItemsBatch(allParentIds)
  const parents = parentsResult.value

  // Build lookup: parentId → WorkItemType
  const parentTypeMap = new Map<number, string>()
  const featureParentIds: number[] = []

  for (const parent of parents) {
    const pId = parent.id
    const pType = parent.fields['System.WorkItemType']
    parentTypeMap.set(pId, pType)

    if (pType === 'Feature') {
      featureParentIds.push(pId)
    }
  }

  // Determine orphan status based on parent type:
  // Epic or Feature → chain OK (at least one valid ancestor)
  // Anything else (User Story, Issue, etc.) → orphan
  const typeOkParentIds = new Set<number>()
  const orphanParentIds = new Set<number>()

  for (const [pId, pType] of parentTypeMap) {
    if (pType === 'Epic' || pType === 'Feature') {
      typeOkParentIds.add(pId)
    } else {
      orphanParentIds.add(pId)
    }
  }

  // Step 5: For Feature parents, check if THEY have an Epic parent
  if (featureParentIds.length > 0) {
    const featuresResult = await getWorkItemsBatch(featureParentIds)
    const features = featuresResult.value

    for (const feature of features) {
      const featureId = feature.id
      const featureParent = feature.fields['System.Parent']

      if (featureParent) {
        // Feature has a parent — check if it's an Epic
        const epicParentId = Number(featureParent)
        // Fetch that specific parent to check its type
        const epicParentsResult = await getWorkItemsBatch([epicParentId])
        const epicParent = epicParentsResult.value[0]

        if (epicParent && epicParent.fields['System.WorkItemType'] === 'Epic') {
          // Feature → Epic chain is valid, this Feature's children are NOT orphan
          // (they're already in typeOkParentIds from step 4)
        } else {
          // Feature's parent is NOT an Epic → Feature's children ARE orphan
          typeOkParentIds.delete(featureId)
          orphanParentIds.add(featureId)
        }
      } else {
        // Feature has NO parent → its children ARE orphan
        typeOkParentIds.delete(featureId)
        orphanParentIds.add(featureId)
      }
    }
  }

  // Step 6: Collect orphaned child items
  const orphanWorkItems: WorkItem[] = [...orphansNoParent]

  for (const [pId, childIds] of parentMap) {
    if (orphanParentIds.has(pId)) {
      // All children of this parent are orphaned
      for (const childId of childIds) {
        const childItem = allItems.find(item => item.id === childId)
        if (childItem) {
          orphanWorkItems.push(childItem)
        }
      }
    }
  }

  // Step 7: Client-side filter by assignedTo email
  // WIQL's [System.AssignedTo] uses displayName, not uniqueName (email).
  const emailLower = email.toLowerCase()
  const filteredOrphans = orphanWorkItems.filter(item => {
    // ADO returns identity as object { uniqueName, displayName } but
    // the WorkItemField type declares it as string. Cast to any for
    // runtime safety — both shapes exist in the API.
    const identity = item.fields['System.AssignedTo'] as any
    const assignedTo = typeof identity === 'string'
      ? identity
      : identity?.uniqueName ?? null
    return assignedTo?.toLowerCase() === emailLower
  })

  return filteredOrphans.map(item => transformWorkItemToUI(item))
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
// Epics & Features (hierarchy)
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

export async function getEpics(searchQuery?: string): Promise<{ value: WorkItemRef[] }> {
  const searchFilter = searchQuery
    ? `AND [System.Title] CONTAINS '${searchQuery.replace(/'/g, "''")}'`
    : ''
  const wiql = {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = 'DESARROLLO TECNOLOGICO' AND [System.WorkItemType] = 'Epic' ${searchFilter} ORDER BY [System.Title] ASC`,
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

export async function getFeaturesByEpic(epicId?: number): Promise<{ value: WorkItemRef[] }> {
  const epicFilter = epicId ? `AND [System.Parent] = ${epicId}` : ''
  const wiql = {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = 'DESARROLLO TECNOLOGICO' AND [System.WorkItemType] = 'Feature' ${epicFilter} ORDER BY [System.Title] ASC`,
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
  description?: string
  state?: string
  assignedTo?: string
  iterationPath?: string
  parentId?: number
  tags?: string        // semicolon-separated, e.g. "frontend; backend"
  effortPoints?: number
  priority?: number    // 1-4
  fechaInicio?: string
  fechaFin?: string
}

export function createWorkItem(data: CreateWorkItemData) {
  const { type, title, description, state, assignedTo, iterationPath, parentId, tags, effortPoints, priority, fechaInicio, fechaFin } = data

  const patches: PatchOperation[] = [
    { op: 'add', path: '/fields/System.Title', value: title },
  ]

  if (description) {
    patches.push({ op: 'add', path: '/fields/System.Description', value: description })
  }

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
    patches.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.Effort', value: effortPoints })
    // RemainingWork starts equal to Effort at creation (mirrors the Resuelto transition logic)
    patches.push({ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: effortPoints })
  }

  if (priority !== undefined) {
    patches.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: priority })
  }

  if (fechaInicio) {
    patches.push({ op: 'add', path: '/fields/Custom.FechaInicio', value: fechaInicio })
  }

  if (fechaFin) {
    patches.push({ op: 'add', path: '/fields/Custom.FechaFin', value: fechaFin })
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

export function createWorkItemComment(id: number, text: string) {
  return request<{ id: number; text: string; createdDate: string }>(`/workitems/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// ============================================
// Auth
// ============================================

export function changePassword(currentPassword: string, newPassword: string) {
  return request<{ ok: boolean; message: string }>('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function updatePAT(pat: string) {
  return request<{ ok: boolean; message: string }>('/auth/pat', {
    method: 'PUT',
    body: JSON.stringify({ pat }),
  })
}

export function getPATStatus() {
  return request<{ valid: boolean; reason?: string; message?: string }>('/auth/pat-status')
}