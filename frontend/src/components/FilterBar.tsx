import { useBoardStore } from '../store/boardStore'
import { useIterations, useMembers } from '../hooks/useWorkItems'

export function FilterBar() {
  const {
    sprintPath,
    setSprintPath,
    filterType,
    setFilterType,
    filterAssigned,
    setFilterAssigned,
    searchQuery,
    setSearchQuery,
    showOrphanView,
    setShowOrphanView,
  } = useBoardStore()

  const { data: iterations } = useIterations()
  const { data: members } = useMembers()

  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-2 sm:gap-4 flex-wrap">
      {/* Sprint Selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="filter-sprint" className="text-sm text-muted-foreground">Sprint:</label>
        <select
          id="filter-sprint"
          name="sprint"
          value={sprintPath || ''}
          onChange={(e) => setSprintPath(e.target.value || null)}
          className="text-sm border border-input rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Seleccionar sprint...</option>
          {iterations?.value?.map((iteration) => (
            <option key={iteration.id} value={iteration.path}>
              {iteration.name}{iteration.attributes?.timeFrame === 'current' ? ' · Actual' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Divider - hidden on mobile */}
      <div className="hidden sm:block w-px h-6 bg-border" />

      {/* Tipo Filter - hidden on small screens */}
      <div className="hidden md:flex items-center gap-2">
        <label htmlFor="filter-type" className="text-sm text-muted-foreground">Tipo:</label>
        <select
          id="filter-type"
          name="type"
          value={filterType || ''}
          onChange={(e) => setFilterType(e.target.value || null)}
          className="text-sm border border-input rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos</option>
          <option value="Task">Task</option>
          <option value="Bug">Bug</option>
        </select>
      </div>

      {/* Asignado Filter - hidden on small screens */}
      <div className="hidden md:flex items-center gap-2">
        <label htmlFor="filter-assigned" className="text-sm text-muted-foreground">Asignado:</label>
        <select
          id="filter-assigned"
          name="assigned"
          value={filterAssigned || ''}
          onChange={(e) => setFilterAssigned(e.target.value || null)}
          className="text-sm border border-input rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos</option>
          <option value="unassigned">Sin asignar</option>
          {members?.value?.map((member) => (
            <option key={member.email || member.displayName} value={member.email}>
              {member.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        {/* Orphan tasks button — only visible with user filter active */}
        {filterAssigned && filterAssigned !== 'unassigned' && (
          <button
            onClick={() => setShowOrphanView(!showOrphanView)}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-md transition-colors border focus:outline-none focus:ring-2 focus:ring-ring ${
              showOrphanView
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Tareas huérfanas
          </button>
        )}
        <input
          id="filter-search"
          name="search"
          type="text"
          placeholder="Buscar..."
          aria-label="Buscar tareas"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm border border-input rounded-md px-3 py-1.5 w-32 sm:w-48 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Limpiar búsqueda"
            className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}