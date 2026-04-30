// Utilidades para trabajar con Work Items
import type { WorkItemUI, Assignees } from '../types'

// ============================================
// Parse assignees from tags
// Multi-asignado: tags con prefijo "assignee:" en System.Tags
// ============================================

export function parseAssigneesFromTags(tags: string[]): Assignees {
  const assignees: Assignees = {
    primary: null,
    additional: [],
  }

  if (!tags.length) {
    return assignees
  }

  // Buscar tags con prefijo "assignee:"
  const additionalTags = tags
    .map((t) => t.trim())
    .filter((t) => t.startsWith('assignee:'))

  if (additionalTags.length > 0) {
    assignees.additional = additionalTags.map((t) => t.replace('assignee:', '').trim())
  }

  return assignees
}

// Get display name from email
export function getDisplayNameFromEmail(email: string | null): string {
  if (!email) return 'Sin asignar'
  
  // "jcastro03@itsinfocom.com" → "Johan Castro"
  const namePart = email.split('@')[0]
  const parts = namePart.split(/[0-9]/) // remove numbers
  const firstName = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1).toLowerCase()
  
  return firstName || email
}

// Extract initials from display name
export function getInitials(displayName: string): string {
  const parts = displayName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return displayName.substring(0, 2).toUpperCase()
}

// ============================================
// Build patch operations
// ============================================

export interface PatchOp {
  op: 'add' | 'replace' | 'remove'
  path: string
  value?: string
}

export function buildPatchState(state: string): PatchOp[] {
  return [
    {
      op: 'replace',
      path: '/fields/System.State',
      value: state,
    },
  ]
}

export function buildPatchAssignee(email: string | null): PatchOp[] {
  if (email === null) {
    return [{ op: 'remove', path: '/fields/System.AssignedTo' }]
  }
  return [
    {
      op: 'add',
      path: '/fields/System.AssignedTo',
      value: email,
    },
  ]
}

// ============================================
// Group work items by assignee
// ============================================

export function groupByAssignee(
  workItems: WorkItemUI[]
): Map<string, WorkItemUI[]> {
  const groups = new Map<string, WorkItemUI[]>()

  for (const item of workItems) {
    const assignee = item.assignedTo || 'unassigned'
    const existing = groups.get(assignee) || []
    groups.set(assignee, [...existing, item])
  }

  return groups
}

// ============================================
// Group work items by state (for board view)
// ============================================

export function groupByState(
  workItems: WorkItemUI[]
): Record<string, WorkItemUI[]> {
  const groups: Record<string, WorkItemUI[]> = {}

  for (const item of workItems) {
    if (!groups[item.state]) {
      groups[item.state] = []
    }
    groups[item.state].push(item)
  }

  return groups
}