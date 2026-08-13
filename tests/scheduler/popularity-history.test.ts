import { describe, expect, it } from 'vitest'
import {
  buildPopularityHistoryTableRows,
  buildPopularityHistorySeries,
  formatPopularityHistoryTooltipValue,
  getPopularityHistoryDisplaySamplingState,
  getNextPopularityHistoryRefreshDelay,
  getPopularityHistoryDataState,
  getPopularityHistoryWindow,
  POPULARITY_HISTORY_CAMPAIGN_END,
  POPULARITY_HISTORY_CAMPAIGN_START,
  POPULARITY_HISTORY_REFRESH_INTERVAL_MS,
  POPULARITY_HISTORY_TERMINAL_SETTLE_MS,
  SchedulerPopularityHistoryAccessError,
  summarizePopularityHistoryCoverage,
  type SchedulerPopularityHistoryResponse,
} from '../../utils/scheduler'

function response(
  points: SchedulerPopularityHistoryResponse['points'],
  effectiveInterval = 300,
): SchedulerPopularityHistoryResponse {
  return {
    semester_id: '2610',
    course_code: 'AIAA1001',
    section_id: null,
    tracking_started_at: '2026-08-01T00:00:00Z',
    tracking_ends_at: '2026-09-30T15:59:00Z',
    source_interval_seconds: 300,
    effective_interval_seconds: effectiveInterval,
    generated_at: '2026-08-12T00:10:00Z',
    latest_scheduled_sample_at: points.at(-1)?.sampled_at || null,
    latest_observed_sample_at: points.at(-1)?.observed_at || null,
    requested_coverage_end_at: '2026-08-12T00:10:00Z',
    sampling_state: points.length ? 'fresh' : 'not_started',
    terminal_present: false,
    coverage_buckets: points.map(point => ({
      bucket_at: point.sampled_at,
      expected_samples: 1,
      observed_samples: 1,
      partial: false,
    })),
    points,
  }
}

describe('scheduler popularity history', () => {
  it('requires a bounded campaign window for every range', () => {
    expect(POPULARITY_HISTORY_CAMPAIGN_START).toBe('2026-07-31T16:00:00.000Z')
    const now = new Date('2026-08-13T08:30:00.000Z')

    expect(getPopularityHistoryWindow('24h', now)).toEqual({
      from: '2026-08-12T08:30:00.000Z',
      to: '2026-08-13T08:30:00.000Z',
    })
    expect(getPopularityHistoryWindow('7d', now).from).toBe('2026-08-06T08:30:00.000Z')
    expect(getPopularityHistoryWindow('30d', now).from).toBe(POPULARITY_HISTORY_CAMPAIGN_START)
    expect(getPopularityHistoryWindow('all', now)).toEqual({
      from: POPULARITY_HISTORY_CAMPAIGN_START,
      to: '2026-08-13T08:30:00.000Z',
    })
  })

  it('clamps every history query to the campaign cutoff', () => {
    const afterCampaign = new Date('2026-10-12T08:30:00.000Z')
    const window = getPopularityHistoryWindow('all', afterCampaign)

    expect(window.from).toBe(POPULARITY_HISTORY_CAMPAIGN_START)
    expect(window.to).toBe(new Date(POPULARITY_HISTORY_CAMPAIGN_END).toISOString())
    expect(getPopularityHistoryWindow('24h', afterCampaign)).toEqual({
      from: '2026-09-29T15:59:00.000Z',
      to: '2026-09-30T15:59:00.000Z',
    })
  })

  it('aligns visible refreshes to five-minute boundaries, fetches the terminal sample, then stops', () => {
    const shortlyAfterBoundary = Date.parse('2026-08-13T08:30:12.000Z')
    expect(getNextPopularityHistoryRefreshDelay(shortlyAfterBoundary)).toBe(
      POPULARITY_HISTORY_REFRESH_INTERVAL_MS - 2_000,
    )
    expect(getNextPopularityHistoryRefreshDelay(Date.parse('2026-08-13T08:30:00.000Z'))).toBe(10_000)
    expect(getNextPopularityHistoryRefreshDelay(Date.parse('2026-08-13T08:29:55.000Z'))).toBe(15_000)
    expect(getNextPopularityHistoryRefreshDelay(Date.parse(POPULARITY_HISTORY_CAMPAIGN_END))).toBe(
      POPULARITY_HISTORY_TERMINAL_SETTLE_MS,
    )
    expect(getNextPopularityHistoryRefreshDelay(
      Date.parse(POPULARITY_HISTORY_CAMPAIGN_END) + POPULARITY_HISTORY_TERMINAL_SETTLE_MS - 1_000,
    )).toBe(1_000)
    expect(getNextPopularityHistoryRefreshDelay(
      Date.parse(POPULARITY_HISTORY_CAMPAIGN_END) + POPULARITY_HISTORY_TERMINAL_SETTLE_MS,
    )).toBeNull()
    expect(getNextPopularityHistoryRefreshDelay(Date.parse('2026-10-01T00:00:00.000Z'))).toBeNull()
  })

  it('distinguishes not-started tracking from an empty selected range', () => {
    expect(getPopularityHistoryDataState({ ...response([]), tracking_started_at: null })).toBe('not-started')
    expect(getPopularityHistoryDataState(response([]))).toBe('empty')
    expect(getPopularityHistoryDataState(response([
      { sampled_at: '2026-08-12T00:00:00Z', observed_at: '2026-08-12T00:00:03Z', looking_count: 0, scheduling_count: 0 },
    ]))).toBe('ready')
  })

  it('exposes structured access failures without identity data', () => {
    const error = new SchedulerPopularityHistoryAccessError('scope', 404)
    expect(error).toMatchObject({ kind: 'scope', status: 404 })
    expect(Object.keys(error).join(' ')).not.toMatch(/user|email|identity/i)
  })

  it('preserves observed zero counts and uses coverage buckets for internal gaps', () => {
    const payload = response([
      { sampled_at: '2026-08-12T00:10:00Z', observed_at: '2026-08-12T00:10:03Z', looking_count: 4, scheduling_count: 2 },
      { sampled_at: '2026-08-12T00:00:00Z', observed_at: '2026-08-12T00:00:04Z', looking_count: 0, scheduling_count: 0 },
    ])
    payload.coverage_buckets = [
      { bucket_at: '2026-08-12T00:00:00Z', expected_samples: 1, observed_samples: 1, partial: false },
      { bucket_at: '2026-08-12T00:05:00Z', expected_samples: 1, observed_samples: 0, partial: true },
      { bucket_at: '2026-08-12T00:10:00Z', expected_samples: 1, observed_samples: 1, partial: false },
    ]
    const series = buildPopularityHistorySeries(payload)

    expect(series.looking).toEqual([
      { x: Date.parse('2026-08-12T00:00:00Z'), y: 0, observedAt: Date.parse('2026-08-12T00:00:04Z') },
      { x: Date.parse('2026-08-12T00:05:00Z'), y: null },
      { x: Date.parse('2026-08-12T00:09:59.999Z'), y: null },
      { x: Date.parse('2026-08-12T00:10:00Z'), y: 4, observedAt: Date.parse('2026-08-12T00:10:03Z') },
    ])
    expect(series.scheduling.at(0)?.y).toBe(0)
    expect(series.scheduling.at(1)?.y).toBeNull()
  })

  it('labels tooltip gaps as missing without confusing a genuine zero', () => {
    expect(formatPopularityHistoryTooltipValue(null, 'Missing')).toBe('Missing')
    expect(formatPopularityHistoryTooltipValue(Number.NaN, 'Missing')).toBe('Missing')
    expect(formatPopularityHistoryTooltipValue(Number.POSITIVE_INFINITY, 'Missing')).toBe('Missing')
    expect(formatPopularityHistoryTooltipValue(0, 'Missing')).toBe('0')
    expect(formatPopularityHistoryTooltipValue(2.6, 'Missing')).toBe('3')
  })

  it('builds accessible missing rows when expected coverage has no points', () => {
    const payload = response([])
    payload.coverage_buckets = [
      { bucket_at: '2026-08-12T00:05:00Z', expected_samples: 1, observed_samples: 0, partial: true },
      { bucket_at: '2026-08-12T00:00:00Z', expected_samples: 1, observed_samples: 0, partial: true },
    ]

    expect(getPopularityHistoryDataState(payload)).toBe('empty')
    expect(buildPopularityHistoryTableRows(payload)).toEqual([
      {
        bucket_at: '2026-08-12T00:05:00Z',
        expected_samples: 1,
        observed_samples: 0,
        partial: true,
        point: undefined,
        state: 'missing',
      },
      {
        bucket_at: '2026-08-12T00:00:00Z',
        expected_samples: 1,
        observed_samples: 0,
        partial: true,
        point: undefined,
        state: 'missing',
      },
    ])
  })

  it('does not invent a gap for regular samples', () => {
    const series = buildPopularityHistorySeries(response([
      { sampled_at: '2026-08-12T00:00:00Z', observed_at: '2026-08-12T00:00:03Z', looking_count: 1, scheduling_count: 2 },
      { sampled_at: '2026-08-12T00:05:00Z', observed_at: '2026-08-12T00:05:03Z', looking_count: 2, scheduling_count: 3 },
    ]))

    expect(series.looking).toHaveLength(2)
    expect(series.looking.every(point => point.y !== null)).toBe(true)
    expect(series.looking.map(point => point.x)).toEqual([
      Date.parse('2026-08-12T00:00:00Z'),
      Date.parse('2026-08-12T00:05:00Z'),
    ])
    expect(series.looking.map(point => point.observedAt)).toEqual([
      Date.parse('2026-08-12T00:00:03Z'),
      Date.parse('2026-08-12T00:05:03Z'),
    ])
  })

  it('uses epoch-aligned coverage for downsampled gaps', () => {
    const payload = response([
      { sampled_at: '2026-08-12T00:19:00Z', observed_at: '2026-08-12T00:19:04Z', looking_count: 1, scheduling_count: 2 },
      { sampled_at: '2026-08-12T00:31:00Z', observed_at: '2026-08-12T00:31:04Z', looking_count: 2, scheduling_count: 3 },
    ], 600)
    payload.coverage_buckets = [
      { bucket_at: '2026-08-12T00:10:00Z', expected_samples: 2, observed_samples: 2, partial: false },
      { bucket_at: '2026-08-12T00:20:00Z', expected_samples: 2, observed_samples: 0, partial: true },
      { bucket_at: '2026-08-12T00:30:00Z', expected_samples: 2, observed_samples: 2, partial: false },
    ]
    const series = buildPopularityHistorySeries(payload)

    expect(series.looking).toEqual([
      { x: Date.parse('2026-08-12T00:19:00Z'), y: 1, observedAt: Date.parse('2026-08-12T00:19:04Z') },
      { x: Date.parse('2026-08-12T00:20:00Z'), y: null },
      { x: Date.parse('2026-08-12T00:31:00Z'), y: 2, observedAt: Date.parse('2026-08-12T00:31:04Z') },
    ])
  })

  it('shows leading and trailing missing coverage without fabricating zero counts', () => {
    const payload = response([
      { sampled_at: '2026-08-12T00:05:00Z', observed_at: '2026-08-12T00:05:03Z', looking_count: 3, scheduling_count: 1 },
    ])
    payload.coverage_buckets = [
      { bucket_at: '2026-08-12T00:00:00Z', expected_samples: 1, observed_samples: 0, partial: true },
      { bucket_at: '2026-08-12T00:05:00Z', expected_samples: 1, observed_samples: 1, partial: false },
      { bucket_at: '2026-08-12T00:10:00Z', expected_samples: 1, observed_samples: 0, partial: true },
    ]

    expect(buildPopularityHistorySeries(payload).looking).toEqual([
      { x: Date.parse('2026-08-12T00:00:00Z'), y: null },
      { x: Date.parse('2026-08-12T00:04:59.999Z'), y: null },
      { x: Date.parse('2026-08-12T00:05:00Z'), y: 3, observedAt: Date.parse('2026-08-12T00:05:03Z') },
      { x: Date.parse('2026-08-12T00:10:00Z'), y: null },
    ])
    expect(summarizePopularityHistoryCoverage(payload)).toMatchObject({
      expectedSamples: 3,
      observedSamples: 1,
      missingBuckets: 2,
      partialBuckets: 0,
      trailingMissingBuckets: 1,
      trailingPartial: false,
      hasIncompleteCoverage: true,
    })
  })

  it('keeps a partial bucket point but isolates it from continuous lines', () => {
    const payload = response([
      { sampled_at: '2026-08-12T00:04:00Z', observed_at: '2026-08-12T00:04:04Z', looking_count: 2, scheduling_count: 1 },
    ], 600)
    payload.coverage_buckets = [
      { bucket_at: '2026-08-12T00:00:00Z', expected_samples: 2, observed_samples: 1, partial: true },
    ]

    expect(buildPopularityHistorySeries(payload).looking).toEqual([
      { x: Date.parse('2026-08-12T00:04:00Z') - 1, y: null },
      { x: Date.parse('2026-08-12T00:04:00Z'), y: 2, partial: true, observedAt: Date.parse('2026-08-12T00:04:04Z') },
      { x: Date.parse('2026-08-12T00:09:59.999Z'), y: null },
    ])
    expect(summarizePopularityHistoryCoverage(payload)).toMatchObject({
      partialBuckets: 1,
      trailingPartial: true,
    })
  })

  it('breaks immediately before a boundary sample and spans its trailing gap', () => {
    const payload = response([
      { sampled_at: '2026-08-12T00:00:00Z', observed_at: '2026-08-12T00:00:03Z', looking_count: 2, scheduling_count: 1 },
    ], 600)
    payload.coverage_buckets = [
      { bucket_at: '2026-08-12T00:00:00Z', expected_samples: 2, observed_samples: 1, partial: true },
    ]

    expect(buildPopularityHistorySeries(payload).looking).toEqual([
      { x: Date.parse('2026-08-12T00:00:00Z') - 1, y: null },
      { x: Date.parse('2026-08-12T00:00:00Z'), y: 2, partial: true, observedAt: Date.parse('2026-08-12T00:00:03Z') },
      { x: Date.parse('2026-08-12T00:09:59.999Z'), y: null },
    ])
  })

  it('uses explicit sampler truth instead of generated or displayed point timestamps', () => {
    const payload = response([
      { sampled_at: '2026-08-12T00:05:00Z', observed_at: '2026-08-12T00:05:17Z', looking_count: 2, scheduling_count: 1 },
    ])
    payload.generated_at = '2026-08-12T00:30:00Z'
    payload.latest_scheduled_sample_at = '2026-08-12T00:25:00Z'
    payload.latest_observed_sample_at = '2026-08-12T00:25:09Z'
    payload.sampling_state = 'stale'

    expect(payload.latest_observed_sample_at).not.toBe(payload.generated_at)
    expect(payload.latest_observed_sample_at).not.toBe(payload.points.at(-1)?.observed_at)
    expect(getPopularityHistoryDisplaySamplingState(payload)).toBe('stale')
  })

  it.each([
    'not_started',
    'fresh',
    'stale',
    'ended_complete',
    'ended_incomplete',
  ] as const)('preserves the backend %s sampling state', (samplingState) => {
    const payload = { ...response([]), sampling_state: samplingState }
    if (samplingState === 'ended_complete') payload.terminal_present = true
    expect(getPopularityHistoryDisplaySamplingState(payload)).toBe(samplingState)
  })

  it('fails closed when complete state lacks the exact terminal sample', () => {
    const payload = {
      ...response([]),
      sampling_state: 'ended_complete' as const,
      terminal_present: false,
    }
    expect(getPopularityHistoryDisplaySamplingState(payload)).toBe('ended_incomplete')
  })

  it('keeps history response types anonymous', () => {
    const payload = response([])
    expect(JSON.stringify(payload)).not.toMatch(/user_?id|username|email|identity/i)
  })
})
