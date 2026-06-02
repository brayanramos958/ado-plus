// TanStack Query hooks for orphan (unsprint + unparented) work items
import { useQuery } from '@tanstack/react-query'
import { queryUnsprintItems, queryUnparentedItems } from '../api/client'
import type { WorkItemUI } from '../types'

// ============================================
// Unsprint Work Items
// ============================================

/**
 * Fetch Task/Bug items assigned to the user that have no sprint set.
 *
 * Query key: ['unsprint-items', email]
 * Enabled only when email is provided (individual user view).
 * Stale for 2 minutes — orphan data doesn't change rapidly.
 *
 * @param email       - The assigned-to email (from filterAssigned). null = disabled.
 * @param displayName - Display name for WIQL filtering (ADO uses displayName,
 *                      not email, in [System.AssignedTo] comparisons).
 */
export function useUnsprintWorkItems(
  email: string | null,
  displayName?: string | null
) {
  return useQuery<WorkItemUI[]>({
    queryKey: ['unsprint-items', email],
    queryFn: () => {
      if (!email) throw new Error('email is required')
      return queryUnsprintItems(email, displayName)
    },
    enabled: !!email,
    staleTime: 2 * 60_000,
    refetchInterval: false,
  })
}

// ============================================
// Unparented Work Items
// ============================================

/**
 * Detect Task/Bug items assigned to the user that lack an Epic or Feature
 * ancestor in the hierarchy chain.
 *
 * Query key: ['unparented-items', email]
 * **Lazy-enabled**: the query only fires when both `email` is provided AND
 * the caller explicitly enables it (typically when the user clicks the
 * "Sin épica/feature" tab). This avoids expensive multi-step detection on
 * every board mount.
 *
 * @param email       - The assigned-to email (from filterAssigned). null = disabled.
 * @param opts        - Optional overrides:
 *   - enabled: explicit enable flag. Defaults to !!email, but the caller in
 *     Phase 3 should pass `enabled: activeTab === 'unparented'` for lazy activation.
 *   - displayName: Display name for WIQL filtering (ADO uses displayName,
 *     not email, in [System.AssignedTo] comparisons).
 */
export function useUnparentedWorkItems(
  email: string | null,
  opts?: { enabled?: boolean; displayName?: string | null }
) {
  const enabled = opts?.enabled ?? !!email

  return useQuery<WorkItemUI[]>({
    queryKey: ['unparented-items', email],
    queryFn: () => {
      if (!email) throw new Error('email is required')
      return queryUnparentedItems(email, opts?.displayName)
    },
    enabled,
    staleTime: 2 * 60_000,
    refetchInterval: false,
  })
}
