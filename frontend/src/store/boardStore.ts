import { create } from 'zustand'

interface BoardState {
  sprintPath: string | null
  setSprintPath: (path: string | null) => void

  filterType: string | null
  setFilterType: (type: string | null) => void

  filterAssigned: string | null
  setFilterAssigned: (email: string | null) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  viewMode: 'board' | 'list'
  setViewMode: (mode: 'board' | 'list') => void

  currentUser: string | null
  setCurrentUser: (email: string | null) => void

  selectedWorkItemId: number | null
  setSelectedWorkItemId: (id: number | null) => void

  isCreateModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void

  editingWorkItemId: number | null
  setEditingWorkItemId: (id: number | null) => void

  showOrphanView: boolean
  setShowOrphanView: (show: boolean) => void

}

export const useBoardStore = create<BoardState>((set) => ({
  sprintPath: null,
  setSprintPath: (path) => set({ sprintPath: path }),

  filterType: null,
  setFilterType: (type) => set({ filterType: type }),

  filterAssigned: null,
  setFilterAssigned: (email) => set({ filterAssigned: email, showOrphanView: false }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  viewMode: 'board',
  setViewMode: (mode) => set({ viewMode: mode }),

  currentUser: null,
  setCurrentUser: (email) => set({ currentUser: email }),

  selectedWorkItemId: null,
  setSelectedWorkItemId: (id) => set({ selectedWorkItemId: id }),

  isCreateModalOpen: false,
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

  editingWorkItemId: null,
  setEditingWorkItemId: (id) => set({ editingWorkItemId: id }),

  showOrphanView: false,
  setShowOrphanView: (show) => set({ showOrphanView: show }),

}))
