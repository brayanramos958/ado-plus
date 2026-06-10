import { useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { useQueryClient } from '@tanstack/react-query'
import type { WorkItemUI } from '../types'
import { useUnsprintWorkItems, useUnparentedWorkItems } from '../hooks/useOrphanItems'
import { useMembers } from '../hooks/useWorkItems'
import { useBoardStore } from '../store/boardStore'
import { WorkItemCard } from './WorkItemCard'
import { Spinner } from './Spinner'

// ============================================
// OrphanSection — Main component
// ============================================

interface OrphanSectionProps {
  userEmail: string | null
  /** Full-width mode — for standalone view (not inline in SprintBoard) */
  fullWidth?: boolean
  onWorkItemClick?: (id: number) => void
}

export function OrphanSection({ userEmail, fullWidth, onWorkItemClick }: OrphanSectionProps) {
  // ALL hooks must be called unconditionally, before any early return.
  // This satisfies the Rules of Hooks — React relies on call order being
  // identical across renders.
  const [activeTab, setActiveTab] = useState<'unsprint' | 'unparented'>('unsprint')
  const queryClient = useQueryClient()

  // Look up display name from members data — WIQL [System.AssignedTo]
  // compares against displayName, NOT email (uniqueName).
  const { data: membersData } = useMembers()
  const member = userEmail
    ? membersData?.value?.find((m) => m.email.toLowerCase() === userEmail.toLowerCase())
    : undefined
  const displayName = member?.displayName ?? null
  const userName = member?.displayName ?? (userEmail ? userEmail.split('@')[0] : '')

  // Both queries are disabled when userEmail is null (via the hooks' own
  // `enabled: !!email` guard). They fire once displayName resolves.
  const {
    data: unsprintItems,
    isLoading: unsprintLoading,
    error: unsprintError,
  } = useUnsprintWorkItems(userEmail, displayName)

  const {
    data: unparentedItems,
    isLoading: unparentedLoading,
    error: unparentedError,
  } = useUnparentedWorkItems(userEmail, {
    enabled: !!displayName,
    displayName,
  })

  // Early return AFTER all hooks — safe because hooks are already registered.
  if (!userEmail) return null

  const unsprintCount = unsprintItems?.length ?? 0
  const unparentedCount = unparentedItems?.length ?? 0

  const handleTabChange = (value: unknown) => {
    setActiveTab(value as 'unsprint' | 'unparented')
  }

  const handleWorkItemClick = (id: number) => {
    onWorkItemClick?.(id) ?? useBoardStore.getState().setSelectedWorkItemId(id)
  }

  return (
    <div className={`h-full w-full flex flex-col ${fullWidth ? '' : 'border border-border rounded-lg bg-card/50 p-3 mb-3'}`}>
      {/* Header — only shown in fullWidth mode */}
      {fullWidth && (
        <div className="flex-shrink-0 p-3 bg-background border-b border-border flex items-center gap-3">
          <button
            onClick={() => useBoardStore.getState().setShowOrphanView(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al tablero
          </button>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-semibold text-foreground">
              Tareas huérfanas de {userName}
            </span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['unsprint-items'] })
              queryClient.invalidateQueries({ queryKey: ['unparented-items'] })
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Refrescar tareas huérfanas"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      )}

      {/* Tabs + Content */}
      <div className={`flex-1 flex flex-col min-h-0 ${fullWidth ? 'p-4' : ''}`}>
        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          <Tabs.List className={`flex gap-1 border-b border-border pb-2 ${fullWidth ? 'mb-4' : 'mb-3'}`}>
            <Tabs.Tab
              value="unsprint"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors data-[active]:bg-primary/10 data-[active]:text-primary text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Sin sprint
              <CountBadge count={unsprintCount} loading={unsprintLoading} />
            </Tabs.Tab>
            <Tabs.Tab
              value="unparented"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors data-[active]:bg-primary/10 data-[active]:text-primary text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Sin épica/feature
              <CountBadge count={unparentedCount} loading={unparentedLoading} />
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="unsprint" className="flex-1 min-h-0 overflow-auto">
            <UnsprintPanel
              items={unsprintItems ?? []}
              isLoading={unsprintLoading}
              error={unsprintError}
              onWorkItemClick={handleWorkItemClick}
              fullWidth={fullWidth}
            />
          </Tabs.Panel>

          <Tabs.Panel value="unparented" className="flex-1 min-h-0 overflow-auto">
            <UnparentedPanel
              items={unparentedItems ?? []}
              isLoading={unparentedLoading}
              error={unparentedError}
              onWorkItemClick={handleWorkItemClick}
              fullWidth={fullWidth}
            />
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </div>
  )
}

// ============================================
// CountBadge
// ============================================

function CountBadge({
  count,
  loading,
  hidden = false,
}: {
  count: number
  loading: boolean
  hidden?: boolean
}) {
  if (hidden) return null

  if (loading) {
    return (
      <span className="ml-1.5 inline-flex">
        <Spinner size="sm" />
      </span>
    )
  }

  return (
    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/15 text-primary font-semibold leading-none">
      {count}
    </span>
  )
}

// ============================================
// UnsprintPanel — "Sin sprint" tab content
// ============================================

function UnsprintPanel({
  items,
  isLoading,
  error,
  onWorkItemClick,
  fullWidth,
}: {
  items: WorkItemUI[]
  isLoading: boolean
  error: Error | null
  onWorkItemClick?: (id: number) => void
  fullWidth?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="md" />
        <span className="ml-2 text-sm text-muted-foreground">
          Buscando tareas sin sprint\u2026
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-red-500 dark:text-red-400">
          Error al buscar tareas sin sprint
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {error.message}
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No hay tareas sin sprint
      </p>
    )
  }

  return (
    <div className={fullWidth
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
      : 'flex gap-2 overflow-x-auto pb-2'
    }>
      {items.map((item) => (
        <div key={item.id} className={fullWidth ? '' : 'flex-shrink-0 w-[220px]'}>
          <WorkItemCard
            workItem={item}
            draggable={false}
            showStateControls={false}
            onClick={onWorkItemClick}
          />
        </div>
      ))}
    </div>
  )
}

// ============================================
// UnparentedPanel — "Sin épica/feature" tab content
// ============================================

function UnparentedPanel({
  items,
  isLoading,
  error,
  onWorkItemClick,
  fullWidth,
}: {
  items: WorkItemUI[]
  isLoading: boolean
  error: Error | null
  onWorkItemClick?: (id: number) => void
  fullWidth?: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner size="md" />
        <span className="ml-2 text-sm text-muted-foreground">
          Detectando tareas sin épica/feature\u2026
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-red-500 dark:text-red-400">
          Error al buscar tareas sin épica/feature
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {error.message}
        </p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No hay tareas sin épica/feature
      </p>
    )
  }

  return (
    <div className={fullWidth
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
      : 'flex gap-2 overflow-x-auto pb-2'
    }>
      {items.map((item) => (
        <div key={item.id} className={fullWidth ? '' : 'flex-shrink-0 w-[220px]'}>
          <WorkItemCard
            workItem={item}
            draggable={false}
            showStateControls={false}
            onClick={onWorkItemClick}
          />
        </div>
      ))}
    </div>
  )
}
