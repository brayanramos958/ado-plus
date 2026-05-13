// TanStack Query hooks
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/client'
import type { WorkItemUI } from '../types'

// ============================================
// Queries
// ============================================

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  })
}

export function useIterations() {
  return useQuery({
    queryKey: ['iterations'],
    queryFn: api.getIterations,
  })
}

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: api.getMembers,
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: api.getTags,
    staleTime: 10 * 60_000,
  })
}

export function useEpics(searchQuery?: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery ?? '')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery ?? ''), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  return useQuery({
    queryKey: ['epics', debouncedQuery || null],
    queryFn: () => api.getEpics(debouncedQuery || undefined),
    staleTime: 5 * 60_000,
  })
}

export function useFeaturesByEpic(epicId?: number | null) {
  return useQuery({
    queryKey: ['features', epicId ?? null],
    queryFn: () => api.getFeaturesByEpic(epicId ?? undefined),
    staleTime: 2 * 60_000,
    enabled: epicId != null,
  })
}

export function useCurrentSprint() {
  const { data, ...rest } = useIterations()
  const current = data?.value?.find((i) => i.attributes.timeFrame === 'current')
  return { ...rest, data: current }
}

// Work items for a sprint
export function useSprintWorkItems(sprintPath: string) {
  return useQuery({
    queryKey: ['workitems', sprintPath],
    queryFn: async () => {
      // 1. Query IDs
      const idsResult = await api.queryWorkItems({ sprintPath })
      const ids = idsResult.workItems.map((w) => w.id)

      if (ids.length === 0) {
        return []
      }

      // 2. Fetch batch details
      const batchResult = await api.getWorkItemsBatch(ids)

      // 3. Transform to UI format
      const workItems: WorkItemUI[] = batchResult.value.map((item) => {
        const identity = item.fields['System.AssignedTo'] as string | { uniqueName?: string; displayName?: string } | null
        // Handle both string and object formats
        let assignedTo: string | null = null
        let assignedToName: string | null = null

        if (identity) {
          if (typeof identity === 'string') {
            // It's a string (email)
            assignedTo = identity || null
            assignedToName = identity.split('@')[0]
          } else {
            // It's an object
            assignedTo = identity.uniqueName ?? null
            assignedToName = identity.displayName ?? null
          }
        }

        return {
        id: item.fields['System.Id'],
        title: item.fields['System.Title'],
        type: item.fields['System.WorkItemType'] as WorkItemUI['type'],
        state: item.fields['System.State'] as WorkItemUI['state'],
        iterationPath: item.fields['System.IterationPath'],
        assignedTo,
        assignedToName,
        tags: item.fields['System.Tags']
          ? item.fields['System.Tags'].split(';').map(t => t.trim()).filter(Boolean)
          : [],
        createdDate: item.fields['System.CreatedDate'],
        changedDate: item.fields['System.ChangedDate'],
        createdBy: item.fields['System.CreatedBy'],
        rev: item.fields['System.Rev'],
        fechaInicio: item.fields['Custom.FechaInicio'],
        fechaFin: item.fields['Custom.FechaFin'],
        effortPoints: item.fields['Microsoft.VSTS.Scheduling.Effort'] ?? undefined,
        effortField: item.fields['Microsoft.VSTS.Scheduling.Effort'] != null
          ? 'Microsoft.VSTS.Scheduling.Effort' as const
          : undefined,
        completedWork: item.fields['Microsoft.VSTS.Scheduling.RemainingWork'] ?? undefined,
        priority: item.fields['Microsoft.VSTS.Common.Priority'] ?? undefined,
      }})

      return workItems
    },
    enabled: !!sprintPath,
    refetchInterval: 30_000,
  })
}

// ============================================
// Single Work Item Details & Hierarchy
// ============================================

export function useWorkItemHierarchy(taskId: number | null) {
  return useQuery({
    queryKey: ['workitem-hierarchy', taskId],
    queryFn: async () => {
      if (!taskId) return null

      // Fetch task details (which includes relations via $expand=all)
      const task = await api.getWorkItemDetails(taskId)
      let feature: api.WorkItem | null = null
      let epic: api.WorkItem | null = null

      // Helper to extract parent ID from a work item
      const getParentId = (item: api.WorkItem): number | null => {
        // Try System.Parent field first (modern ADO)
        if (item.fields['System.Parent']) {
          return Number(item.fields['System.Parent'])
        }
        // Fallback to relations array
        const parentRel = item.relations?.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse')
        if (parentRel) {
          return parseInt(parentRel.url.split('/').pop() || '0', 10)
        }
        return null
      }

      // 1. Get Feature (Parent of Task)
      const featureId = getParentId(task)
      if (featureId) {
        feature = await api.getWorkItemDetails(featureId)
        
        // 2. Get Epic (Parent of Feature)
        const epicId = getParentId(feature)
        if (epicId) {
          epic = await api.getWorkItemDetails(epicId)
        }
      }

      return {
        task,
        feature,
        epic
      }
    },
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

export function useWorkItemComments(id: number | null) {
  return useQuery({
    queryKey: ['workitem-comments', id],
    queryFn: () => (id ? api.getWorkItemComments(id) : null),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // Cache comments for 1 min
  })
}

// ============================================
// Mutations
// ============================================

export function useUpdateWorkItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patches }: { id: number; patches: api.PatchOperation[] }) =>
      api.updateWorkItem(id, patches),
    onMutate: async ({ id, patches }) => {
      await queryClient.cancelQueries({ queryKey: ['workitems'] })
      const prevEntries = queryClient.getQueriesData<WorkItemUI[]>({ queryKey: ['workitems'] })

      // Build a full optimistic update from every patch so the UI reflects
      // all changes instantly without waiting for the refetch.
      const update: Partial<WorkItemUI> = {}
      for (const p of patches) {
        switch (p.path) {
          case '/fields/System.Title':
            update.title = p.value as string; break
          case '/fields/System.State':
            update.state = p.value as WorkItemUI['state']; break
          case '/fields/System.AssignedTo':
            update.assignedTo = (p.value as string) || null; break
          case '/fields/System.IterationPath':
            update.iterationPath = p.value as string; break
          case '/fields/System.Tags':
            update.tags = (p.value as string).split(';').map((t) => t.trim()).filter(Boolean); break
          case '/fields/Microsoft.VSTS.Common.Priority':
            update.priority = p.value as number; break
          case '/fields/Microsoft.VSTS.Scheduling.Effort':
            update.effortPoints = p.value as number; break
          case '/fields/Microsoft.VSTS.Scheduling.RemainingWork':
            update.completedWork = p.value as number; break
          case '/fields/Custom.FechaInicio':
            update.fechaInicio = (p.value as string) || undefined; break
          case '/fields/Custom.FechaFin':
            update.fechaFin = (p.value as string) || undefined; break
        }
      }

      if (Object.keys(update).length > 0) {
        queryClient.setQueriesData<WorkItemUI[]>(
          { queryKey: ['workitems'] },
          (old) => old?.map((item) => (item.id === id ? { ...item, ...update } : item))
        )
      }

      return { prevEntries }
    },
    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.prevEntries ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: (_data, _err, { id }) => {
      // Invalidate the sprint board list
      queryClient.invalidateQueries({ queryKey: ['workitems'] })
      // Invalidate the detail caches for this specific item so WorkItemModal
      // and WorkItemQuickEdit show fresh data on next open.
      queryClient.invalidateQueries({ queryKey: ['workitem-hierarchy', id] })
      queryClient.invalidateQueries({ queryKey: ['workitem-full', id] })
    },
  })
}

export function useCreateWorkItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: api.CreateWorkItemData) => api.createWorkItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workitems'] })
    },
  })
}

export function useDeleteWorkItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api.deleteWorkItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workitems'] })
    },
  })
}

export function useCreateWorkItemComment(workItemId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => api.createWorkItemComment(workItemId, text),
    onSuccess: () => {
      // Refresh comment list
      queryClient.invalidateQueries({ queryKey: ['workitem-comments', workItemId] })
      // Refresh sprint items so changedDate updates in footer
      queryClient.invalidateQueries({ queryKey: ['workitems'] })
    },
  })
}