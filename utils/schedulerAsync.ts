export interface LatestRequestToken {
  isCurrent: () => boolean
  signal: AbortSignal
}

export interface LatestRequestTracker {
  begin: () => LatestRequestToken
  invalidate: () => void
}

export interface LatestSettlementToken {
  isCurrent: () => boolean
}

export interface LatestSettlementTracker {
  begin: () => LatestSettlementToken
}

export interface BooleanIntentTracker {
  clearIfCurrent: (key: string, token: number) => void
  next: (key: string, currentValue: boolean) => BooleanIntentSubmission
  set: (key: string, value: boolean) => BooleanIntentSubmission
}

export interface BooleanIntentSubmission {
  token: number
  value: boolean
}

export type SchedulerCartMutationFailureKind =
  | 'write-ambiguous-reconciled'
  | 'state-unverified'
  | 'blocked'

export class SchedulerCartMutationError extends Error {
  readonly kind: SchedulerCartMutationFailureKind
  readonly originalError: unknown

  constructor(kind: SchedulerCartMutationFailureKind, originalError?: unknown) {
    super(kind)
    this.name = 'SchedulerCartMutationError'
    this.kind = kind
    this.originalError = originalError
  }
}

export function getSchedulerCartMutationFailureKind(
  error: unknown,
): SchedulerCartMutationFailureKind | null {
  return error instanceof SchedulerCartMutationError ? error.kind : null
}

export function createLatestRequestTracker(): LatestRequestTracker {
  let generation = 0
  let activeController: AbortController | null = null

  return {
    begin() {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      const requestGeneration = ++generation
      return {
        isCurrent: () => requestGeneration === generation,
        signal: controller.signal,
      }
    },
    invalidate() {
      generation += 1
      activeController?.abort()
      activeController = null
    },
  }
}

export function createLatestSettlementTracker(): LatestSettlementTracker {
  let generation = 0

  return {
    begin() {
      const settlementGeneration = ++generation
      return { isCurrent: () => settlementGeneration === generation }
    },
  }
}

export function createBooleanIntentTracker(): BooleanIntentTracker {
  const intents = new Map<string, BooleanIntentSubmission>()
  let nextToken = 0

  function store(key: string, value: boolean): BooleanIntentSubmission {
    const submission = { token: ++nextToken, value }
    intents.set(key, submission)
    return submission
  }

  return {
    clearIfCurrent(key, token) {
      if (intents.get(key)?.token === token) intents.delete(key)
    },
    next(key, currentValue) {
      return store(key, !(intents.get(key)?.value ?? currentValue))
    },
    set(key, value) {
      return store(key, value)
    },
  }
}

export async function runPendingSchedulerAction(
  pendingCodes: Set<string>,
  courseCode: string,
  action: () => Promise<void>,
): Promise<void> {
  if (pendingCodes.has(courseCode)) return

  pendingCodes.add(courseCode)
  try {
    await action()
  } finally {
    pendingCodes.delete(courseCode)
  }
}
