import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBoardStore } from '../store/boardStore'
import { useCurrentSprint, useIterations, useSprintWorkItems, useMembers } from '../hooks/useWorkItems'
import { Header } from '../components/Header'
import { FilterBar } from '../components/FilterBar'
import { SprintBoard } from '../components/SprintBoard'
import { OrphanSection } from '../components/OrphanSection'
import { PageLoader } from '../components/Spinner'
import { WorkItemModal } from '../components/WorkItemModal'
import { CreateTaskModal } from '../components/CreateTaskModal'
import { WorkItemQuickEdit } from '../components/WorkItemQuickEdit'
import type { WorkItemUI } from '../types'
import type { QueryClient } from '@tanstack/react-query'

/**
 * Find a work item for the QuickEdit modal — tries sprint workItems first,
 * then falls back to orphan caches (unsprint-items / unparented-items).
 *
 * Without this, editing orphan cards fails because OrphanSection stores its
 * data under separate TanStack Query cache keys that are invisible to
 * {@link useSprintWorkItems}.
 */
function findEditingWorkItem(
  id: number | null,
  sprintItems: WorkItemUI[] | undefined,
  assignedEmail: string | null,
  qc: QueryClient
): WorkItemUI | null {
  if (id == null) return null

  // 1) Try sprint work items (board / normal view)
  const fromSprint = sprintItems?.find((w) => w.id === id)
  if (fromSprint) return fromSprint

  // 2) Not found — search orphan caches (OrphanSection view)
  if (!assignedEmail) return null

  const unsprint = qc.getQueryData<WorkItemUI[]>(['unsprint-items', assignedEmail])
  const fromUnsprint = unsprint?.find((w) => w.id === id)
  if (fromUnsprint) return fromUnsprint

  const unparented = qc.getQueryData<WorkItemUI[]>(['unparented-items', assignedEmail])
  const fromUnparented = unparented?.find((w) => w.id === id)
  if (fromUnparented) return fromUnparented

  return null
}

/**
 * Convert ISO date string to local date display without UTC timezone bug.
 * new Date("YYYY-MM-DD") interprets as UTC midnight → in UTC-5 shows the day before.
 * This extracts [y, m, d] and builds a local Date instead.
 */
function fmtDateLocal(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SprintPage() {
  const {
    sprintPath, setSprintPath,
    selectedWorkItemId, setSelectedWorkItemId,
    isCreateModalOpen, setCreateModalOpen,
    editingWorkItemId, setEditingWorkItemId,
    filterAssigned,
    showOrphanView,
  } = useBoardStore()

  // Get current sprint
  const { data: currentSprint, isLoading: loadingSprint } = useCurrentSprint()
  const { data: allIterations } = useIterations()
  const { data: members } = useMembers()
  const { data: workItems } = useSprintWorkItems(sprintPath || '')

  const selectedSprint = allIterations?.value?.find((i) => i.path === sprintPath) || currentSprint
  const selectedWorkItem = workItems?.find((w) => w.id === selectedWorkItemId)

  // Get editing work item data — try sprint workItems first, then
  // search orphan caches (needed when editing from OrphanSection view)
  const queryClient = useQueryClient()
  const editingWorkItem = findEditingWorkItem(
    editingWorkItemId,
    workItems,
    filterAssigned,
    queryClient
  )

  // Auto-set sprint on mount
  useEffect(() => {
    if (currentSprint && !sprintPath) {
      setSprintPath(currentSprint.path)
    }
  }, [currentSprint, sprintPath, setSprintPath])

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - NO sticky, se mueve con el scroll */}
      <Header onNewTask={() => setCreateModalOpen(true)} />

      {loadingSprint ? (
        <PageLoader message="Cargando sprint..." />
      ) : selectedSprint ? (
        <>
          {/* Sprint Info */}
          <div className="border-b border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-transparent via-blue-50/80 to-transparent dark:from-transparent dark:via-blue-950/40 dark:to-transparent px-4 py-2">
            <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">

              {/* Badge + nombre */}
              <div className="flex items-center gap-2">
                {selectedSprint.attributes.timeFrame === 'current' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Actual
                  </span>
                )}
                <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 tracking-tight">
                  {selectedSprint.name}
                </h2>
              </div>

              {/* Separador */}
              <div className="hidden sm:block w-px h-5 bg-blue-200 dark:bg-blue-800" />

              {/* Fechas */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-white/70 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 rounded-md px-2.5 py-1 shadow-sm">
                  <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    {fmtDateLocal(selectedSprint.attributes.startDate)}
                  </span>
                </div>

                <svg className="w-3.5 h-3.5 text-blue-300 dark:text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>

                <div className="flex items-center gap-1.5 bg-white/70 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60 rounded-md px-2.5 py-1 shadow-sm">
                  <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    {fmtDateLocal(selectedSprint.attributes.finishDate)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* FilterBar */}
          <FilterBar />

          {/* Board Area */}
          <div className="flex-1 min-h-0">
            {showOrphanView && filterAssigned ? (
              <OrphanSection
                userEmail={filterAssigned}
                fullWidth
                onWorkItemClick={setSelectedWorkItemId}
              />
            ) : sprintPath ? (
              <SprintBoard
                sprintPath={sprintPath}
                onWorkItemClick={setSelectedWorkItemId}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Selecciona un sprint para ver las tareas
              </div>
            )}
          </div>

          {/* Detail Modal */}
          <WorkItemModal
            workItem={selectedWorkItem}
            members={members?.value || []}
            isOpen={!!selectedWorkItemId}
            onClose={() => setSelectedWorkItemId(null)}
          />
        </>
      ) : null}

      <CreateTaskModal
        key={isCreateModalOpen ? 'open' : 'closed'}
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultSprintPath={sprintPath}
        defaultAssignedTo={filterAssigned}
      />

      {/* Quick Edit Modal */}
      <WorkItemQuickEdit
        key={editingWorkItem ? `${editingWorkItem.id}-${editingWorkItemId != null}` : 'closed'}
        workItem={editingWorkItem}
        isOpen={editingWorkItemId != null}
        onClose={() => setEditingWorkItemId(null)}
      />
    </div>
  )
}