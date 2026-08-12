import { describe, expect, it } from 'vitest'
import {
  buildPopularityHistorySeries,
  getNextPopularityHistoryRefreshDelay,
  getPopularityHistoryDataState,
  getPopularityHistoryWindow,
  POPULARITY_HISTORY_CAMPAIGN_END,
  POPULARITY_HISTORY_CAMPAIGN_START,
  POPULARITY_HISTORY_REFRESH_INTERVAL_MS,
  POPULARITY_HISTORY_TERMINAL_SETTLE_MS,
  SchedulerPopularityHistoryAccessError,
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
    points,
  }
}

describe('scheduler popularity history', () => {
  it('requires a bounded campaign window for every range', () => {
    const now = new Date('2026-08-13T08:30:00.000Z')

    expect(getPopularityHistoryWindow('24h', now)).toEqual({
      from: '2026-08-12T08:30:00.000Z',
      to: '2026-08-13T08:30:00.000Z',
    })
    expect(getPopularityHistoryWindow('7d', now).from).toBe(POPULARITY_HISTORY_CAMPAIGN_START)
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
      { sampled_at: '2026-08-12T00:00:00Z', looking_count: 0, scheduling_count: 0 },
    ]))).toBe('ready')
  })

  it('exposes structured access failures without identity data', () => {
    const error = new SchedulerPopularityHistoryAccessError('scope', 404)
    expect(error).toMatchObject({ kind: 'scope', status: 404 })
    expect(Object.keys(error).join(' ')).not.toMatch(/user|email|identity/i)
  })

  it('preserves zero counts and inserts nulls only for missing samples', () => {
    const series = buildPopularityHistorySeries(response([
      { sampled_at: '2026-08-12T00:10:00Z', looking_count: 4, scheduling_count: 2 },
      { sampled_at: '2026-08-12T00:00:00Z', looking_count: 0, scheduling_count: 0 },
    ]))

    expect(series.looking).toEqual([
      { x: Date.parse('2026-08-12T00:00:00Z'), y: 0 },
      { x: Date.parse('2026-08-12T00:05:00Z'), y: null },
      { x: Date.parse('2026-08-12T00:10:00Z'), y: 4 },
    ])
    expect(series.scheduling.at(0)?.y).toBe(0)
    expect(series.scheduling.at(1)?.y).toBeNull()
  })

  it('does not invent a gap for regular samples', () => {
    const series = buildPopularityHistorySeries(response([
      { sampled_at: '2026-08-12T00:00:00Z', looking_count: 1, scheduling_count: 2 },
      { sampled_at: '2026-08-12T00:05:00Z', looking_count: 2, scheduling_count: 3 },
    ]))

    expect(series.looking).toHaveLength(2)
    expect(series.looking.every(point => point.y !== null)).toBe(true)
  })

  it('detects a missing downsample bucket even when last-value timestamps are close', () => {
    const series = buildPopularityHistorySeries(response([
      { sampled_at: '2026-08-12T00:19:00Z', looking_count: 1, scheduling_count: 2 },
      { sampled_at: '2026-08-12T00:31:00Z', looking_count: 2, scheduling_count: 3 },
    ], 600))

    expect(series.looking).toEqual([
      { x: Date.parse('2026-08-12T00:19:00Z'), y: 1 },
      { x: Date.parse('2026-08-12T00:29:00Z'), y: null },
      { x: Date.parse('2026-08-12T00:31:00Z'), y: 2 },
    ])
  })

  it('keeps history response types anonymous', () => {
    const payload = response([])
    expect(Object.keys(payload).join(' ')).not.toMatch(/user|name|email|identity/i)
  })
})
