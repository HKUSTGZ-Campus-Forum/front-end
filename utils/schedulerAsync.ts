export interface LatestRequestToken {
  isCurrent: () => boolean
  signal: AbortSignal
}

export interface LatestRequestTracker {
  begin: () => LatestRequestToken
  invalidate: () => void
}

export interface BooleanIntentTracker {
  clearIfCurrent: (key: string, value: boolean) => void
  next: (key: string, currentValue: boolean) => boolean
  set: (key: string, value: boolean) => void
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

export function createBooleanIntentTracker(): BooleanIntentTracker {
  const intents = new Map<string, boolean>()

  return {
    clearIfCurrent(key, value) {
      if (intents.get(key) === value) intents.delete(key)
    },
    next(key, currentValue) {
      const nextValue = !(intents.get(key) ?? currentValue)
      intents.set(key, nextValue)
      return nextValue
    },
    set(key, value) {
      intents.set(key, value)
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
