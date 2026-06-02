export type WorkItemType = 'Task' | 'Bug' | 'Epic' | 'Feature' | 'Issue'

export type WorkItemState =
  | 'Por Hacer'
  | 'Planeado'
  | 'En proceso'
  | 'Bloqueado'
  | 'Resuelto'
  | 'Cerrado'
  | 'New'
  | 'Active'
  | 'Resolved'
  | 'Closed'

export const TASK_STATES: WorkItemState[] = [
  'Por Hacer',
  'Planeado',
  'En proceso',
  'Bloqueado',
  'Resuelto',
  'Cerrado',
]

export const BUG_STATES: WorkItemState[] = [
  'New',
  'Active',
  'Resolved',
  'Closed',
]

export const WORKITEM_TYPE_COLORS: Record<WorkItemType, string> = {
  Task: '#8B4513',
  Bug: '#DC2626',
  Epic: '#EA580C',
  Feature: '#7C3AED',
  Issue: '#7C3AED',
}

// 1 = low → 4 = critical (this team's ADO convention — reversed from standard)
export const PRIORITY_COLORS: Record<number, string> = {
  1: '#6B7280',
  2: '#FBBF24',
  3: '#F97316',
  4: '#DC2626',
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Baja',
  2: 'Media',
  3: 'Alta',
  4: 'Crítica',
}

export const TASK_STATE_COLORS: Record<WorkItemState, string> = {
  'Por Hacer': '#9CA3AF',
  'Planeado': '#FBBF24',
  'En proceso': '#3B82F6',
  'Bloqueado': '#EF4444',
  'Resuelto': '#F97316',
  'Cerrado': '#22C55E',
  'New': '#6B7280',
  'Active': '#3B82F6',
  'Resolved': '#F97316',
  'Closed': '#22C55E',
}

// ADO returns an identity object for AssignedTo, CreatedBy, etc. — NOT a plain string
export interface ADOIdentity {
  displayName: string
  uniqueName: string  // email address
  imageUrl: string
}

export interface WorkItemField {
  'System.Id': number
  'System.Title': string
  'System.State': WorkItemState
  'System.WorkItemType': WorkItemType
  'System.AssignedTo': ADOIdentity | null  // identity object, NOT a string
  'System.IterationPath': string
  'System.Tags': string
  'System.CreatedDate': string
  'System.ChangedDate': string
  'System.CreatedBy': string
  'System.Rev': number
  // Custom fields (solo para Task)
  'Custom.FechaInicio'?: string
  'Custom.FechaFin'?: string
}

export interface WorkItem {
  id: number
  rev: number
  fields: WorkItemField
  url: string
}

export interface WorkItemUI {
  id: number
  title: string
  type: WorkItemType
  state: WorkItemState
  iterationPath: string
  assignedTo: string | null        // email from ADOIdentity.uniqueName
  assignedToName: string | null
  tags: string[]                   // parsed from System.Tags (semicolon-separated)
  createdDate: string
  changedDate: string
  createdBy: string
  rev: number
  // Custom fields
  fechaInicio?: string
  fechaFin?: string
  effortPoints?: number            // estimated hours
  effortField?: 'Microsoft.VSTS.Scheduling.Effort'
  completedWork?: number
  priority?: number
  // Orphan detection: parent ID for unparented items (used by assign-parent action)
  parentId?: number
}

export interface Assignees {
  primary: string | null
  additional: string[]
}

// ============================================
// Iteration / Sprint
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

export interface IterationResponse {
  value: Iteration[]
  count: number
}

// ============================================
// Member / Team
// ============================================

export interface Member {
  email: string
  displayName: string
  avatar?: string
  isAdmin: boolean
}

export interface MembersResponse {
  value: Member[]
  count: number
}