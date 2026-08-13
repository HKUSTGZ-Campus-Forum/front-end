import { describe, expect, it, vi } from 'vitest'
import {
  createBooleanIntentTracker,
  createLatestRequestTracker,
  runPendingSchedulerAction,
} from '../../utils/schedulerAsync'

describe('scheduler async state helpers', () => {
  it('derives rapid course and bundle toggles from the last submitted intent', () => {
    const tracker = createBooleanIntentTracker()

    const courseOn = tracker.next('course:AIAA1001', false)
    const courseOff = tracker.next('course:AIAA1001', false)
    expect([courseOn, courseOff]).toEqual([true, false])

    const bundleOff = tracker.next('bundle:AIAA1001:1:0', true)
    const bundleOn = tracker.next('bundle:AIAA1001:1:0', true)
    expect([bundleOff, bundleOn]).toEqual([false, true])
  })

  it('lets a layer intent seed the next bundle click without stale props', () => {
    const tracker = createBooleanIntentTracker()
    const key = 'bundle:AIAA1001:1:0'

    tracker.set(key, false)
    const bundleOnAfterNone = tracker.next(key, true)
    tracker.clearIfCurrent(key, false)
    const bundleOffAgain = tracker.next(key, true)

    expect(bundleOnAfterNone).toBe(true)
    expect(bundleOffAgain).toBe(false)
  })

  it('invalidates and aborts older requests when a newer request starts', () => {
    const tracker = createLatestRequestTracker()
    const first = tracker.begin()
    expect(first.isCurrent()).toBe(true)
    expect(first.signal.aborted).toBe(false)

    const second = tracker.begin()
    expect(first.isCurrent()).toBe(false)
    expect(first.signal.aborted).toBe(true)
    expect(second.isCurrent()).toBe(true)

    tracker.invalidate()
    expect(second.isCurrent()).toBe(false)
    expect(second.signal.aborted).toBe(true)
  })

  it('keeps a course pending until its async action settles and blocks re-entry', async () => {
    let resolveAction!: () => void
    const deferred = new Promise<void>((resolve) => {
      resolveAction = resolve
    })
    const pendingCodes = new Set<string>()
    const action = vi.fn(() => deferred)

    const first = runPendingSchedulerAction(pendingCodes, 'AIAA1001', action)
    const duplicate = runPendingSchedulerAction(pendingCodes, 'AIAA1001', action)

    expect(pendingCodes.has('AIAA1001')).toBe(true)
    expect(action).toHaveBeenCalledOnce()
    await duplicate
    expect(pendingCodes.has('AIAA1001')).toBe(true)

    resolveAction()
    await first
    expect(pendingCodes.has('AIAA1001')).toBe(false)
  })

  it('clears pending state when an action fails', async () => {
    const pendingCodes = new Set<string>()

    await expect(runPendingSchedulerAction(
      pendingCodes,
      'AIAA1001',
      async () => {
        throw new Error('request failed')
      },
    )).rejects.toThrow('request failed')

    expect(pendingCodes.has('AIAA1001')).toBe(false)
  })
})
