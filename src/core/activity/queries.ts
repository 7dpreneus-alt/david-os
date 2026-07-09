import { activityRepository } from './recorder'
import type { Activity } from './types'

function byNewest(a: Activity, b: Activity): number {
  return b.createdAt.localeCompare(a.createdAt)
}

/** Most recent activity across the whole system. */
export async function recentActivity(limit = 50): Promise<Activity[]> {
  const all = await activityRepository.list()
  return all.sort(byNewest).slice(0, limit)
}

/** History for one entity — powers per-entity timeline panels. */
export async function activityFor(
  entityId: string,
  limit = 50
): Promise<Activity[]> {
  const all = await activityRepository.list()
  return all
    .filter((a) => a.entityRef.id === entityId)
    .sort(byNewest)
    .slice(0, limit)
}
