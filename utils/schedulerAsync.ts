export interface LatestRequestToken {
  isCurrent: () => boolean
  signal: AbortSignal
}

export interface LatestRequestTracker {
  begin: () => LatestRequestToken
  invalidate: () => void
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
