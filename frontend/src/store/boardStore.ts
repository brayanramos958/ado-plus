// Zustand store para estado de UI
import { create } from 'zustand'

interface BoardState {
  // Sprint activo
  sprintPath: string | null
  setSprintPath: (path: string | null) => void

  // Filtros
  filterType: string | null // 'Task' | 'Bug' | null = todos
  setFilterType: (type: string | null) => void

  filterAssigned: string | null // email | null = todos
  setFilterAssigned: (email: string | null) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  // Modo vista
  viewMode: 'board' | 'list'
  setViewMode: (mode: 'board' | 'list') => void

  // Usuario actual (seleccionado en el header)
  currentUser: string | null
  setCurrentUser: (email: string | null) => void

  // Panel de detalle
  selectedWorkItemId: number | null
  setSelectedWorkItemId: (id: number | null) => void

  // Modal de creación
  isCreateModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void

  // Modal de edición rápida
  editingWorkItemId: number | null
  setEditingWorkItemId: (id: number | null) => void

  // Toast / notificaciones
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useBoardStore = create<BoardState>((set) => ({
  // Sprint
  sprintPath: null,
  setSprintPath: (path) => set({ sprintPath: path }),

  // Filtros
  filterType: null,
  setFilterType: (type) => set({ filterType: type }),

  filterAssigned: null,
  setFilterAssigned: (email) => set({ filterAssigned: email }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Vista
  viewMode: 'board',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Usuario actual
  currentUser: null,
  setCurrentUser: (email) => set({ currentUser: email }),

  // Detalle
  selectedWorkItemId: null,
  setSelectedWorkItemId: (id) => set({ selectedWorkItemId: id }),

  // Modal
  isCreateModalOpen: false,
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

  // Edición rápida
  editingWorkItemId: null,
  setEditingWorkItemId: (id) => set({ editingWorkItemId: id }),

  // Toast
  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}))