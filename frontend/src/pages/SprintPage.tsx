// SprintPage — página principal del sprint
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

  // Loading state
  if (loadingSprint) {
    return <PageLoader message="Cargando sprint..." />
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - NO sticky, se mueve con el scroll */}
      <Header onNewTask={() => setCreateModalOpen(true)} />

      {selectedSprint && (
        <>
          {/* Sprint Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-border px-4 py-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase">
                  {selectedSprint.attributes.timeFrame === 'current' ? 'Sprint Actual' : 'Sprint Seleccionado'}
                </span>
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">{selectedSprint.name}</h2>
              </div>
              <div className="text-xs text-blue-400 dark:text-blue-500">
                {new Date(selectedSprint.attributes.startDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                {' → '}
                {new Date(selectedSprint.attributes.finishDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
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
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultSprintPath={sprintPath}
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