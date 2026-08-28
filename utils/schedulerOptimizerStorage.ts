import type {
  SchedulerOptimizerCourse,
  SchedulerOptimizerScoreProfile,
  SchedulerOptimizerSolveResult,
} from './schedulerOptimizer'
import {
  createDefaultSchedulerOptimizerScoreProfile,
  validateSchedulerOptimizerScoreProfile,
} from './schedulerOptimizer'

export type SchedulerPlannerMode = 'fixed' | 'ranked'

export interface SchedulerOptimizerPersistedConfig {
  schemaVersion: 1
  mode: SchedulerPlannerMode
  candidateCodes: string[]
  minCourses: number
  maxCourses: number
  topX: number
  profile: SchedulerOptimizerScoreProfile
  rankedPlanKey?: string
}

export interface SchedulerOptimizerFingerprint {
  key: string
  canonicalInput: string
}

const CONFIG_SCHEMA_VERSION = 1
const CONFIG_KEY_PREFIX = 'scheduler.optimizer.config.v1.'
const DATABASE_NAME = 'unikorn-scheduler-optimizer'
const DATABASE_VERSION = 1
const RESULT_STORE = 'ranked-results'
const MAX_CACHE_ENTRIES = 12
const MAX_CACHE_BYTES = 12 * 1024 * 1024

interface CachedResultRecord {
  key: string
  canonicalInput: string
  savedAt: number
  result: SchedulerOptimizerSolveResult
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function positiveInteger(value: unknown, fallback: number): number {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback
}

function uniqueCourseCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const code = item.trim()
    if (!code || seen.has(code)) continue
    seen.add(code)
    result.push(code)
  }
  return result
}

function cloneConfig(
  config: SchedulerOptimizerPersistedConfig,
): SchedulerOptimizerPersistedConfig {
  return JSON.parse(JSON.stringify(config)) as SchedulerOptimizerPersistedConfig
}

function migratedScoreProfile(value: unknown): SchedulerOptimizerScoreProfile | null {
  if (!isRecord(value)) return null
  try {
    const candidate = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
    if (Array.isArray(candidate.earlyRules)) {
      const migratedRules: unknown[] = []
      const legacyGroups = new Map<string, number[]>()

      for (const entry of candidate.earlyRules) {
        if (
          !isRecord(entry)
          || Array.isArray(entry.days)
          || typeof entry.day !== 'number'
          || !Number.isInteger(entry.day)
        ) {
          migratedRules.push(entry)
          continue
        }

        const groupKey = JSON.stringify([entry.enabled, entry.startMinute, entry.delta])
        const existingDays = legacyGroups.get(groupKey)
        const day = Number(entry.day)
        if (existingDays) {
          if (!existingDays.includes(day)) {
            existingDays.push(day)
            continue
          }

          const duplicateDayRule: Record<string, unknown> = { ...entry, days: [day] }
          delete duplicateDayRule.day
          migratedRules.push(duplicateDayRule)
          continue
        }

        const days = [day]
        const migratedRule: Record<string, unknown> = { ...entry, days }
        delete migratedRule.day
        legacyGroups.set(groupKey, days)
        migratedRules.push(migratedRule)
      }

      for (const days of legacyGroups.values()) {
        days.sort((left, right) => left - right)
      }
      candidate.earlyRules = migratedRules
    }

    const profile = candidate as unknown as SchedulerOptimizerScoreProfile
    validateSchedulerOptimizerScoreProfile(profile)
    return profile
  } catch {
    return null
  }
}

export function createDefaultSchedulerOptimizerConfig(
  candidateCodes: string[] = [],
): SchedulerOptimizerPersistedConfig {
  const candidates = uniqueCourseCodes(candidateCodes)
  const defaultMaximum = Math.max(1, Math.min(9, candidates.length || 9))
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    mode: 'fixed',
    candidateCodes: candidates,
    minCourses: Math.min(3, defaultMaximum),
    maxCourses: defaultMaximum,
    topX: 3,
    profile: createDefaultSchedulerOptimizerScoreProfile(),
  }
}

/**
 * Parse only known fields. A broken scoring profile is replaced as a unit so
 * malformed local data can never reach the exact scorer.
 */
export function parseSchedulerOptimizerConfig(
  payload: unknown,
  fallback: SchedulerOptimizerPersistedConfig = createDefaultSchedulerOptimizerConfig(),
): SchedulerOptimizerPersistedConfig {
  if (!isRecord(payload) || payload.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    return cloneConfig(fallback)
  }

  let profile = JSON.parse(JSON.stringify(fallback.profile)) as SchedulerOptimizerScoreProfile
  const parsedProfile = migratedScoreProfile(payload.profile)
  if (parsedProfile) profile = parsedProfile

  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    mode: payload.mode === 'ranked' ? 'ranked' : 'fixed',
    candidateCodes: uniqueCourseCodes(payload.candidateCodes),
    minCourses: positiveInteger(payload.minCourses, fallback.minCourses),
    maxCourses: positiveInteger(payload.maxCourses, fallback.maxCourses),
    topX: positiveInteger(payload.topX, fallback.topX),
    profile,
    ...(typeof payload.rankedPlanKey === 'string' && payload.rankedPlanKey
      ? { rankedPlanKey: payload.rankedPlanKey }
      : {}),
  }
}

function configKey(semesterId: string): string {
  return `${CONFIG_KEY_PREFIX}${encodeURIComponent(semesterId)}`
}

export function loadSchedulerOptimizerConfig(
  semesterId: string,
  fallback: SchedulerOptimizerPersistedConfig,
): SchedulerOptimizerPersistedConfig {
  if (typeof localStorage === 'undefined') return cloneConfig(fallback)
  try {
    const raw = localStorage.getItem(configKey(semesterId))
    return raw ? parseSchedulerOptimizerConfig(JSON.parse(raw), fallback) : cloneConfig(fallback)
  } catch {
    return cloneConfig(fallback)
  }
}

export function saveSchedulerOptimizerConfig(
  semesterId: string,
  config: SchedulerOptimizerPersistedConfig,
): void {
  if (typeof localStorage === 'undefined') return
  try {
    const key = configKey(semesterId)
    let profile = config.profile
    try {
      validateSchedulerOptimizerScoreProfile(profile)
    } catch {
      // Numeric inputs have temporarily invalid editing states such as an
      // empty string or just "-". Keep saving the other preferences without
      // replacing the last complete scoring profile with that draft.
      profile = createDefaultSchedulerOptimizerScoreProfile()
      const previousRaw = localStorage.getItem(key)
      if (previousRaw) {
        try {
          const previous = JSON.parse(previousRaw) as unknown
          if (isRecord(previous) && isRecord(previous.profile)) {
            profile = migratedScoreProfile(previous.profile) ?? profile
          }
        } catch {
          // A corrupt previous record cannot supply a safe profile; use defaults.
        }
      }
    }
    localStorage.setItem(key, JSON.stringify({ ...config, profile }))
  } catch {
    // Preferences remain usable in memory when browser storage is unavailable.
  }
}

export function stableSchedulerOptimizerStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const primitive = JSON.stringify(value)
    return primitive === undefined ? 'null' : primitive
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSchedulerOptimizerStringify).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .filter(key => record[key] !== undefined)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableSchedulerOptimizerStringify(record[key])}`)
    .join(',')}}`
}

/**
 * Keep cache invalidation tied to data that can change the ranked result.
 * Cart responses may arrive in a different order and `sourceIndex` is only a
 * pointer into the current UI list, so neither belongs in the persisted input
 * identity. Room/instructor changes are also display-only; the timetable reads
 * those fields from the current cart after a plan is selected.
 */
export function canonicalSchedulerOptimizerCandidates(
  candidates: readonly SchedulerOptimizerCourse[],
): unknown[] {
  return candidates
    .map(course => ({
      code: course.code,
      title: course.title,
      credits: course.credits,
      options: course.options
        .map(option => ({
          id: option.id,
          selections: option.selections
            .map(selection => ({
              layer: selection.layer,
              bundleId: selection.bundleId,
            }))
            .sort((left, right) => (
              left.layer - right.layer || left.bundleId - right.bundleId
            )),
          lectures: option.lectures
            .map((lecture) => {
              const dateRanges = Array.isArray(lecture.date_ranges) && lecture.date_ranges.length
                ? lecture.date_ranges
                    .map(range => ({
                      startDate: range.start_date,
                      endDate: range.end_date,
                    }))
                    .sort((left, right) => (
                      left.startDate.localeCompare(right.startDate, 'en')
                      || left.endDate.localeCompare(right.endDate, 'en')
                    ))
                : null
              return {
                day: lecture.day,
                startTime: lecture.start_time,
                endTime: lecture.end_time,
                ...(dateRanges ? { dateRanges } : {}),
              }
            })
            .sort((left, right) => (
              stableSchedulerOptimizerStringify(left)
                .localeCompare(stableSchedulerOptimizerStringify(right), 'en')
            )),
          sections: option.sections
            .map(section => ({
              sectionId: section.sectionId,
              name: section.name,
            }))
            .sort((left, right) => (
              left.sectionId.localeCompare(right.sectionId, 'en')
              || left.name.localeCompare(right.name, 'en')
            )),
        }))
        .sort((left, right) => left.id.localeCompare(right.id, 'en')),
    }))
    .sort((left, right) => left.code.localeCompare(right.code, 'en'))
}

export function createSchedulerOptimizerFingerprint(value: unknown): SchedulerOptimizerFingerprint {
  const canonicalInput = stableSchedulerOptimizerStringify(value)
  let hash = 1469598103934665603n
  const prime = 1099511628211n
  const mask = (1n << 64n) - 1n
  for (let index = 0; index < canonicalInput.length; index += 1) {
    hash ^= BigInt(canonicalInput.charCodeAt(index))
    hash = (hash * prime) & mask
  }
  return {
    key: `ranked-v1-${hash.toString(16).padStart(16, '0')}`,
    canonicalInput,
  }
}

export function schedulerOptimizerFingerprintsEqual(
  left: SchedulerOptimizerFingerprint | null | undefined,
  right: SchedulerOptimizerFingerprint | null | undefined,
): boolean {
  return Boolean(
    left
    && right
    && left.key === right.key
    && left.canonicalInput === right.canonicalInput,
  )
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(RESULT_STORE)) {
        database.createObjectStore(RESULT_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

export async function readSchedulerOptimizerCachedResult(
  fingerprint: SchedulerOptimizerFingerprint,
): Promise<SchedulerOptimizerSolveResult | null> {
  let database: IDBDatabase | null = null
  try {
    database = await openDatabase()
    const record = await new Promise<CachedResultRecord | undefined>((resolve, reject) => {
      const transaction = database!.transaction(RESULT_STORE, 'readonly')
      const request = transaction.objectStore(RESULT_STORE).get(fingerprint.key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as CachedResultRecord | undefined)
    })
    // The canonical input check makes a hash collision a cache miss, never a
    // correctness error. The status check also rejects legacy or corrupted
    // partial records: only exhaustive terminal results are cacheable.
    if (record?.canonicalInput !== fingerprint.canonicalInput) return null
    return record.result.status === 'complete' || record.result.status === 'no-solution'
      ? record.result
      : null
  } catch {
    return null
  } finally {
    database?.close()
  }
}

export async function writeSchedulerOptimizerCachedResult(
  fingerprint: SchedulerOptimizerFingerprint,
  result: SchedulerOptimizerSolveResult,
): Promise<boolean> {
  if (result.status !== 'complete' && result.status !== 'no-solution') return false
  let serializedSize = Number.POSITIVE_INFINITY
  try {
    serializedSize = JSON.stringify(result).length * 2
  } catch {
    return false
  }
  // Skipping an oversized cache entry never truncates the in-memory result.
  if (serializedSize > MAX_CACHE_BYTES) return false

  let database: IDBDatabase | null = null
  try {
    database = await openDatabase()
    const record: CachedResultRecord = {
      key: fingerprint.key,
      canonicalInput: fingerprint.canonicalInput,
      savedAt: Date.now(),
      result,
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction(RESULT_STORE, 'readwrite')
      transaction.objectStore(RESULT_STORE).put(record)
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })

    const records = await new Promise<CachedResultRecord[]>((resolve, reject) => {
      const transaction = database!.transaction(RESULT_STORE, 'readonly')
      const request = transaction.objectStore(RESULT_STORE).getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as CachedResultRecord[])
    })
    const stale = records
      .sort((left, right) => left.savedAt - right.savedAt)
      .slice(0, Math.max(0, records.length - MAX_CACHE_ENTRIES))
    if (stale.length) {
      await new Promise<void>((resolve, reject) => {
        const transaction = database!.transaction(RESULT_STORE, 'readwrite')
        const store = transaction.objectStore(RESULT_STORE)
        for (const item of stale) store.delete(item.key)
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => resolve()
      })
    }
    return true
  } catch {
    return false
  } finally {
    database?.close()
  }
}
