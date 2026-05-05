import { useState } from 'react'
import { WorkItemCard } from './WorkItemCard'
import type { WorkItemUI } from '../types'

interface UserCollapseListProps {
  workItems: WorkItemUI[]
  onWorkItemClick?: (id: number) => void
}

interface AssigneeGroup {
  email: string
  name: string
  items: WorkItemUI[]
}

export function UserCollapseList({ workItems, onWorkItemClick }: UserCollapseListProps) {
  // Group items by assignee
  const assigneeGroups = groupByAssignee(workItems)

  if (assigneeGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-dark-500">
        No hay tareas para mostrar
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {assigneeGroups.map((group) => (
        <UserCollapseItem
          key={group.email || 'unassigned'}
          group={group}
          onWorkItemClick={onWorkItemClick}
        />
      ))}
    </div>
  )
}

// ============================================
// UserCollapseItem — collapsible individual por usuario
// ============================================

interface UserCollapseItemProps {
  group: AssigneeGroup
  onWorkItemClick?: (id: number) => void
}

function UserCollapseItem({ group, onWorkItemClick }: UserCollapseItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Get initials from name
  const initials = group.name === 'Sin asignar'
    ? '?'
    : group.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  // Get state counts for badge
  const stateCounts = group.items.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
      {/* Header del collapsible - siempre visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Avatar del usuario */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
              group.email ? 'bg-blue-500' : 'bg-gray-400'
            }`}
          >
            {initials}
          </div>

          {/* Nombre del usuario y cantidad de tareas */}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {group.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-dark-400">
              {group.items.length} tarea{group.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Estado de las tareas (badge) y toggle */}
        <div className="flex items-center gap-3">
          {/* State badges compactos */}
          <div className="hidden sm:flex items-center gap-1">
            {Object.entries(stateCounts).map(([state, count]) => (
              <span
                key={state}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-dark-300"
              >
                {count} {state}
              </span>
            ))}
          </div>

          {/* Toggle arrow */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Contenido del collapsible - tareas */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-2">
          {/* Grid de tareas - responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {group.items.map((item) => (
              <WorkItemCard
                key={item.id}
                workItem={item}
                onClick={() => onWorkItemClick?.(item.id)}
              />
            ))}
          </div>

          {group.items.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-dark-500 text-center py-4">
              Sin tareas en este estado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Helper function: agrupar tareas por usuario
// ============================================

function groupByAssignee(workItems: WorkItemUI[]): AssigneeGroup[] {
  const assignees = new Map<string, AssigneeGroup>()

  for (const item of workItems) {
    const email = item.assignedTo || ''
    const name = item.assignedToName || item.assignedTo?.split('@')[0] || 'Sin asignar'

    if (!assignees.has(email)) {
      assignees.set(email, { email, name, items: [] })
    }

    assignees.get(email)!.items.push(item)
  }

  // Convert to array and sort by name
  return Array.from(assignees.values()).sort((a, b) => {
    // Put unassigned at the end
    if (!a.email) return 1
    if (!b.email) return -1
    return a.name.localeCompare(b.name)
  })
}