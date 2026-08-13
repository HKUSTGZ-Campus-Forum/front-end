import { describe, expect, it, vi } from 'vitest'
import {
  createBooleanIntentTracker,
  createLatestRequestTracker,
  createLatestSettlementTracker,
  runPendingSchedulerAction,
} from '../../utils/schedulerAsync'

describe('scheduler async state helpers', () => {
  it('derives rapid course and bundle toggles from the last submitted intent', () => {
    const tracker = createBooleanIntentTracker()

    const courseOn = tracker.next('course:AIAA1001', false)
    const courseOff = tracker.next('course:AIAA1001', false)
    expect([courseOn.value, courseOff.value]).toEqual([true, false])

    const bundleOff = tracker.next('bundle:AIAA1001:1:0', true)
    const bundleOn = tracker.next('bundle:AIAA1001:1:0', true)
    expect([bundleOff.value, bundleOn.value]).toEqual([false, true])
  })

  it('uses submission identity so an A/B/C/A settlement cannot clear newer intent', () => {
    const tracker = createBooleanIntentTracker()
    const key = 'bundle:AIAA1001:1:0'

    const firstA = tracker.set(key, true)
    const b = tracker.set(key, false)
    const c = tracker.set(key, true)
    const finalA = tracker.set(key, true)
    expect([firstA.value, b.value, c.value, finalA.value]).toEqual([true, false, true, true])

    tracker.clearIfCurrent(key, firstA.token)
    tracker.clearIfCurrent(key, b.token)
    tracker.clearIfCurrent(key, c.token)
    const afterStaleSettlements = tracker.next(key, false)
    expect(afterStaleSettlements.value).toBe(false)

    tracker.clearIfCurrent(key, finalA.token)
    expect(tracker.next(key, false).value).toBe(true)
  })

  it('only lets the latest-started action update settlement status', () => {
    const tracker = createLatestSettlementTracker()
    const older = tracker.begin()
    const newer = tracker.begin()

    expect(older.isCurrent()).toBe(false)
    expect(newer.isCurrent()).toBe(true)
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
