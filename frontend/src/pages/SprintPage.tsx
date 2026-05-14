import { useEffect } from 'react'
import { useBoardStore } from '../store/boardStore'
import { useCurrentSprint, useIterations, useSprintWorkItems, useMembers } from '../hooks/useWorkItems'
import { Header } from '../components/Header'
import { FilterBar } from '../components/FilterBar'
import { SprintBoard } from '../components/SprintBoard'
import { PageLoader } from '../components/Spinner'
import { WorkItemModal } from '../components/WorkItemModal'
import { CreateTaskModal } from '../components/CreateTaskModal'
import { WorkItemQuickEdit } from '../components/WorkItemQuickEdit'

export function SprintPage() {
  const {
    sprintPath, setSprintPath,
    selectedWorkItemId, setSelectedWorkItemId,
    isCreateModalOpen, setCreateModalOpen,
    editingWorkItemId, setEditingWorkItemId,
    filterAssigned,
  } = useBoardStore()

  // Get current sprint
  const { data: currentSprint, isLoading: loadingSprint } = useCurrentSprint()
  const { data: allIterations } = useIterations()
  const { data: members } = useMembers()
  const { data: workItems } = useSprintWorkItems(sprintPath || '')

  const selectedSprint = allIterations?.value?.find((i) => i.path === sprintPath) || currentSprint
  const selectedWorkItem = workItems?.find((w) => w.id === selectedWorkItemId)

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
                    {new Date(selectedSprint.attributes.startDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                    {new Date(selectedSprint.attributes.finishDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* FilterBar */}
          <FilterBar />

          {/* Board Area */}
          <div className="flex-1 min-h-0">
            {sprintPath ? (
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
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultSprintPath={sprintPath}
        defaultAssignedTo={filterAssigned}
      />

      {/* Quick Edit Modal */}
      <WorkItemQuickEdit
        workItem={workItems?.find((w) => w.id === editingWorkItemId) ?? null}
        isOpen={editingWorkItemId != null}
        onClose={() => setEditingWorkItemId(null)}
      />
    </div>
  )
}