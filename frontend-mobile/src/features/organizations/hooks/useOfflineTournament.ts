import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import type {
  ApiEvent,
  AuthenticatedFetch,
  CachedTournament,
  MatchResultPayload,
  TournamentOperation,
} from '../../../types/domain'
import {
  requestTournamentRevision,
  requestTournamentState,
  synchronizeTournamentState,
} from '../services/organizationApi'
import {
  applyTournamentOperation,
  deterministicUuid,
  getLocalMatchDetail,
  localOperationId,
} from '../services/tournamentEngine'
import {
  readCachedTournament,
  writeCachedTournament,
} from '../services/tournamentCache'

type Options = {
  event: ApiEvent
  organizationId: string
  fetcher: AuthenticatedFetch
}

export function useOfflineTournament({
  event,
  organizationId,
  fetcher,
}: Options) {
  const [cached, setCached] = useState<CachedTournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')
  const cacheRef = useRef<CachedTournament | null>(null)
  const syncingRef = useRef(false)
  const mountedRef = useRef(true)

  const publish = useCallback(
    async (value: CachedTournament) => {
      cacheRef.current = value
      if (mountedRef.current) setCached(value)
      await writeCachedTournament(organizationId, event, value)
    },
    [event, organizationId],
  )

  const syncPending = useCallback(async () => {
    if (syncingRef.current || !cacheRef.current?.pending_operations.length)
      return false
    syncingRef.current = true
    if (mountedRef.current) setSyncing(true)
    let synchronized = false
    try {
      while (cacheRef.current?.pending_operations.length) {
        const submitted = cacheRef.current
        const submittedIds = submitted.pending_operations.map(
          (operation) => operation.id,
        )
        const mutationId = deterministicUuid(
          `${event.id}:sync:${submittedIds.join(':')}`,
        )
        try {
          const server = await synchronizeTournamentState(
            fetcher,
            organizationId,
            submitted.snapshot,
            mutationId,
          )
          const latest = cacheRef.current
          const prefixIsUnchanged = submittedIds.every(
            (id, index) => latest?.pending_operations[index]?.id === id,
          )
          const remaining = prefixIsUnchanged
            ? latest?.pending_operations.slice(submittedIds.length) ?? []
            : latest?.pending_operations ?? []
          let merged = server
          for (const operation of remaining) {
            merged = applyTournamentOperation(merged, operation)
          }
          await publish({
            snapshot: merged,
            pending_operations: remaining,
          })
          synchronized = true
          if (mountedRef.current) {
            setOffline(false)
            setError('')
          }
        } catch (caught) {
          if (
            caught instanceof Error &&
            caught.message === 'TOURNAMENT_REVISION_CONFLICT'
          ) {
            const remote = await requestTournamentState(
              fetcher,
              organizationId,
              event.id,
            )
            const operations = cacheRef.current?.pending_operations ?? []
            let rebased = remote
            for (const operation of operations) {
              rebased = applyTournamentOperation(rebased, operation)
            }
            await publish({
              snapshot: rebased,
              pending_operations: operations,
            })
            continue
          }
          if (mountedRef.current) {
            if (
              caught instanceof Error &&
              caught.name === 'TournamentServerError'
            ) {
              setOffline(false)
              setError(caught.message)
            } else {
              setOffline(true)
            }
          }
          break
        }
      }
    } catch (caught) {
      if (mountedRef.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'TOURNAMENT_SYNC_FAILED',
        )
      }
    } finally {
      syncingRef.current = false
      if (mountedRef.current) setSyncing(false)
    }
    return synchronized
  }, [event, fetcher, organizationId, publish])

  const refresh = useCallback(async () => {
    const didSync = await syncPending()
    if (didSync || cacheRef.current?.pending_operations.length) return
    try {
      if (!cacheRef.current) {
        const snapshot = await requestTournamentState(
          fetcher,
          organizationId,
          event.id,
        )
        await publish({ snapshot, pending_operations: [] })
      } else {
        const revision = await requestTournamentRevision(
          fetcher,
          organizationId,
          event.id,
        )
        if (revision.revision > cacheRef.current.snapshot.revision) {
          const snapshot = await requestTournamentState(
            fetcher,
            organizationId,
            event.id,
          )
          await publish({ snapshot, pending_operations: [] })
        }
      }
      if (mountedRef.current) {
        setOffline(false)
        setError('')
      }
    } catch {
      if (mountedRef.current) setOffline(true)
    }
  }, [event.id, fetcher, organizationId, publish, syncPending])

  useEffect(() => {
    mountedRef.current = true
    let active = true
    void readCachedTournament(organizationId, event)
      .then(async (stored) => {
        if (!active) return
        if (stored) {
          cacheRef.current = stored
          setCached(stored)
        }
        await refresh()
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      mountedRef.current = false
    }
  }, [event, organizationId, refresh])

  useEffect(() => {
    const interval = setInterval(() => {
      if (cacheRef.current?.pending_operations.length) void syncPending()
    }, 10_000)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [refresh, syncPending])

  const commit = useCallback(
    async (operation: TournamentOperation) => {
      const current = cacheRef.current
      if (!current) throw Error('TOURNAMENT_NOT_AVAILABLE_OFFLINE')
      const snapshot = applyTournamentOperation(
        current.snapshot,
        operation,
      )
      await publish({
        snapshot,
        pending_operations: [...current.pending_operations, operation],
      })
      void syncPending()
    },
    [event, publish, syncPending],
  )

  const generateBracket = useCallback(
    () =>
      commit({
        id: localOperationId(event.id),
        type: 'GENERATE_BRACKET',
      }),
    [commit, event.id],
  )
  const generateGroups = useCallback(
    (groupCount: number, advancingCount: number) =>
      commit({
        id: localOperationId(event.id),
        type: 'GENERATE_GROUPS',
        group_count: groupCount,
        advancing_count: advancingCount,
      }),
    [commit, event.id],
  )
  const saveResult = useCallback(
    (
      kind: 'BRACKET' | 'GROUP',
      matchId: string,
      payload: MatchResultPayload,
    ) =>
      commit({
        id: localOperationId(event.id),
        type: 'SAVE_RESULT',
        kind,
        match_id: matchId,
        payload,
      }),
    [commit, event.id],
  )
  const finalizeGroups = useCallback(
    () =>
      commit({
        id: localOperationId(event.id),
        type: 'FINALIZE_GROUPS',
        locked_at: new Date().toISOString(),
      }),
    [commit, event.id],
  )
  const getMatchDetail = useCallback(
    (kind: 'BRACKET' | 'GROUP', matchId: string) => {
      if (!cacheRef.current) return null
      return getLocalMatchDetail(
        cacheRef.current.snapshot,
        kind,
        matchId,
      )
    },
    [],
  )

  return {
    snapshot: cached?.snapshot ?? null,
    loading,
    syncing,
    offline,
    error,
    pendingCount: cached?.pending_operations.length ?? 0,
    generateBracket,
    generateGroups,
    saveResult,
    finalizeGroups,
    getMatchDetail,
    refresh,
  }
}
