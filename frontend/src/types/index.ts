// Tipos para Azure DevOps — basados en la API REST v7.0

// ============================================
// Work Item Types
// ============================================

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

// Estados por tipo de work item
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

// Mapeo de color por tipo
export const WORKITEM_TYPE_COLORS: Record<WorkItemType, string> = {
  Task: '#8B4513',    // Marrón
  Bug: '#DC2626',      // Rojo
  Epic: '#EA580C',     // Naranja
  Feature: '#7C3AED', // Púrpura
  Issue: '#7C3AED', // Púrpura
}

// Prioridad — 4 niveles (1 = crítica, 4 = baja)
export const PRIORITY_COLORS: Record<number, string> = {
  1: '#DC2626',  // Crítica — rojo
  2: '#F97316',  // Alta — naranja
  3: '#FBBF24',  // Media — amarillo
  4: '#6B7280',  // Baja — gris
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Crítica',
  2: 'Alta',
  3: 'Media',
  4: 'Baja',
}

// Mapeo de color por estado (Task)
export const TASK_STATE_COLORS: Record<WorkItemState, string> = {
  'Por Hacer': '#9CA3AF',  // Gris claro
  'Planeado': '#FBBF24',    // Amarillo
  'En proceso': '#3B82F6', // Azul
  'Bloqueado': '#EF4444',   // Rojo
  'Resuelto': '#F97316',   // Naranja
  'Cerrado': '#22C55E',    // Verde
  'New': '#6B7280',
  'Active': '#3B82F6',
  'Resolved': '#F97316',
  'Closed': '#22C55E',
}

// ============================================
// Work Item (respuesta de ADO)
// ============================================

// Estructura que devuelve ADO para campos de identidad (AssignedTo, CreatedBy, etc.)
export interface ADOIdentity {
  displayName: string
  uniqueName: string  // es el email
  imageUrl: string
}

export interface WorkItemField {
  'System.Id': number
  'System.Title': string
  'System.State': WorkItemState
  'System.WorkItemType': WorkItemType
  'System.AssignedTo': ADOIdentity | null  // objeto identidad, NO string
  'System.IterationPath': string
  'System.Tags': string
  'System.CreatedDate': string
  'System.ChangedDate': string
  'System.CreatedBy': string
  'System.Rev': number
  // Custom fields (solo para Task)
  'Custom.FechaInicio'?: string
  'Custom.FechaFin'?: string
  'Custom.TipoHistoriaTecnica'?: string
}

export interface WorkItem {
  id: number
  rev: number
  fields: WorkItemField
  url: string
}

// Work item con parsed fields para UI
export interface WorkItemUI {
  id: number
  title: string
  type: WorkItemType
  state: WorkItemState
  iterationPath: string
  assignedTo: string | null        // email (extraído de ADOIdentity.uniqueName)
  assignedToName: string | null    // nombre para mostrar
  tags: string[] // parsed from System.Tags
  createdDate: string
  changedDate: string
  createdBy: string
  rev: number
  // Custom fields
  fechaInicio?: string
  fechaFin?: string
  tipoHistoriaTecnica?: string
  // Effort / puntos de esfuerzo (= horas estimadas)
  effortPoints?: number
  effortField?: 'Microsoft.VSTS.Scheduling.Effort'
  completedWork?: number
  // Prioridad (1-4)
  priority?: number
}

// Parse assignee from tags (multi-asignado)
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
// Member / Equipo
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