/**
 * SponsorAI  --  Minimal UI Data Layer
 * Supabase JS v2  |  Model: v1.0
 *
 * Exports:
 *   getExploreGrid()
 *   getPropertyDetail()
 *   getPropertyFanScoreSeries()
 *   getCompare()
 *
 * Design rules:
 *  - Prefer v_property_summary_current for all window snapshots.
 *  - Always include model_version + as_of_day in returned payloads.
 *  - Suppression signal = suppression_reason IS NOT NULL (not fanscore_value IS NULL).
 *  - Numeric DB strings are parsed to number before returning.
 *  - No implicit ranking language -- sorting is UI convenience only.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const MODEL_VERSION = 'v1.0'

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type PropertyType = 'driver' | 'team' | 'series' | 'event'
export type ConfidenceBand = 'High' | 'Medium' | 'Low'

export interface WindowSnapshot {
  avgScore:         number | null
  medianScore:      number | null
  trendValue:       number | null   // score-units per day; positive = improving
  volatilityValue:  number | null
  completenessPct:  number | null
  confidenceBand:   ConfidenceBand | null
  confidenceValue:  number | null
  suppressionReason: string | null  // null = not suppressed at window level
}

export interface ScoreComponents {
  norm:         { value: number; weight: number }
  growth:       { value: number; weight: number }
  consistency:  { value: number; weight: number }
  integrityMult:    number
  engagementPoints: number
  maxEp90d:         number
  avgEp30d:         number
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Parse a Supabase numeric string (or number) to number | null. */
function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function toWin(row: Record<string, unknown>, suffix: '30d' | '60d' | '90d'): WindowSnapshot {
  return {
    avgScore:          toNum(row[`avg_score_${suffix}`] as string),
    medianScore:       toNum(row[`median_score_${suffix}`] as string),
    trendValue:        toNum(row[`trend_value_${suffix}`] as string),
    volatilityValue:   toNum(row[`volatility_value_${suffix}`] as string),
    completenessPct:   toNum(row[`completeness_pct_${suffix}`] as string),
    confidenceBand:    (row[`confidence_band_${suffix}`] as ConfidenceBand) ?? null,
    confidenceValue:   toNum(row[`confidence_value_${suffix}`] as string),
    suppressionReason: (row[`suppression_reason_${suffix}`] as string) ?? null,
  }
}

function parseComponents(json: Record<string, unknown> | null): ScoreComponents | null {
  if (!json) return null
  try {
    return {
      norm:        { value: Number((json.norm as Record<string,unknown>).value),  weight: Number((json.norm as Record<string,unknown>).weight) },
      growth:      { value: Number((json.growth as Record<string,unknown>).value), weight: Number((json.growth as Record<string,unknown>).weight) },
      consistency: { value: Number((json.consistency as Record<string,unknown>).value), weight: Number((json.consistency as Record<string,unknown>).weight) },
      integrityMult:    Number(json.integrity_mult),
      engagementPoints: Number(json.engagement_points),
      maxEp90d:         Number(json.max_ep_90d),
      avgEp30d:         Number(json.avg_ep_30d),
    }
  } catch {
    return null
  }
}

/** Throw a typed error and include the Supabase error message. */
function assertData<T>(data: T[] | null, error: { message: string } | null, label: string): T[] {
  if (error) throw new Error(`[SponsorAI:${label}] ${error.message}`)
  if (!data) throw new Error(`[SponsorAI:${label}] No data returned`)
  return data
}

// ---------------------------------------------------------------------------
// 1.  getExploreGrid
// ---------------------------------------------------------------------------

export interface ExploreCard {
  propertyId:    string
  propertyName:  string
  propertyType:  PropertyType
  country:       string | null
  asOfDay:       string          // ISO date
  modelVersion:  string
  win30d:        WindowSnapshot
  avgScore60d:   number | null
  avgScore90d:   number | null
  trendValue90d: number | null
}

export async function getExploreGrid({ limit = 24 }: { limit?: number } = {}): Promise<ExploreCard[]> {
  const { data, error } = await supabase
    .from('v_property_summary_current')
    .select(`
      property_id, property_name, property_type, country,
      as_of_day, model_version,
      avg_score_30d, median_score_30d, trend_value_30d, volatility_value_30d,
      completeness_pct_30d, confidence_band_30d, confidence_value_30d, suppression_reason_30d,
      avg_score_60d,
      avg_score_90d, trend_value_90d
    `)
    .order('avg_score_30d', { ascending: false, nullsFirst: false })
    .limit(limit)

  const rows = assertData(data, error, 'getExploreGrid')

  return rows.map(r => ({
    propertyId:    r.property_id as string,
    propertyName:  r.property_name as string,
    propertyType:  r.property_type as PropertyType,
    country:       r.country as string | null,
    asOfDay:       r.as_of_day as string,
    modelVersion:  r.model_version as string,
    win30d:        toWin(r as Record<string, unknown>, '30d'),
    avgScore60d:   toNum(r.avg_score_60d as string),
    avgScore90d:   toNum(r.avg_score_90d as string),
    trendValue90d: toNum(r.trend_value_90d as string),
  }))
}

// ---------------------------------------------------------------------------
// 2.  getPropertyDetail
// ---------------------------------------------------------------------------

export interface LatestDailyScore {
  date:             string          // ISO date
  modelVersion:     string
  fanscoreValue:    number | null   // may be 0 if suppressed; check isSupressed
  confidenceBand:   ConfidenceBand | null
  confidenceValue:  number | null
  isSupressed:      boolean
  suppressionReason: string | null
  reasons:          string[]
  inputsHash:       string | null
  components:       ScoreComponents | null
}

export interface PropertyDetail {
  propertyId:      string
  propertyName:    string
  propertyType:    PropertyType
  country:         string | null
  eventStartDate:  string | null    // only populated for 'event' type
  asOfDay:         string
  modelVersion:    string
  win30d:          WindowSnapshot
  win60d:          WindowSnapshot
  win90d:          WindowSnapshot
  latestScore:     LatestDailyScore | null
}

export async function getPropertyDetail(propertyId: string): Promise<PropertyDetail> {
  // Query 1: window snapshot from view
  const { data: viewData, error: viewError } = await supabase
    .from('v_property_summary_current')
    .select('*')
    .eq('property_id', propertyId)
    .limit(1)
    .single()

  if (viewError) throw new Error(`[SponsorAI:getPropertyDetail:view] ${viewError.message}`)
  if (!viewData) throw new Error(`[SponsorAI:getPropertyDetail] Property ${propertyId} not found in view`)

  // Query 2: latest daily score + components from fanscore_daily
  const { data: scoreData, error: scoreError } = await supabase
    .from('fanscore_daily')
    .select(`
      metric_date, model_version, fanscore_value,
      confidence_band, confidence_value,
      suppression_reason, reasons, inputs_hash, components_json
    `)
    .eq('property_id', propertyId)
    .eq('model_version', MODEL_VERSION)
    .order('metric_date', { ascending: false })
    .limit(1)

  if (scoreError) throw new Error(`[SponsorAI:getPropertyDetail:daily] ${scoreError.message}`)

  const latest = scoreData?.[0] ?? null
  const v = viewData as Record<string, unknown>

  const latestScore: LatestDailyScore | null = latest
    ? {
        date:              latest.metric_date as string,
        modelVersion:      latest.model_version as string,
        fanscoreValue:     toNum(latest.fanscore_value as string),
        confidenceBand:    latest.confidence_band as ConfidenceBand | null,
        confidenceValue:   toNum(latest.confidence_value as string),
        isSupressed:       latest.suppression_reason !== null,
        suppressionReason: latest.suppression_reason as string | null,
        reasons:           (latest.reasons as string[]) ?? [],
        inputsHash:        latest.inputs_hash as string | null,
        components:        parseComponents(latest.components_json as Record<string, unknown> | null),
      }
    : null

  return {
    propertyId:     v.property_id as string,
    propertyName:   v.property_name as string,
    propertyType:   v.property_type as PropertyType,
    country:        v.country as string | null,
    eventStartDate: v.event_start_date as string | null,
    asOfDay:        v.as_of_day as string,
    modelVersion:   v.model_version as string,
    win30d:         toWin(v, '30d'),
    win60d:         toWin(v, '60d'),
    win90d:         toWin(v, '90d'),
    latestScore,
  }
}

// ---------------------------------------------------------------------------
// 3.  getPropertyFanScoreSeries
// ---------------------------------------------------------------------------

export interface ScorePoint {
  date:             string
  fanscoreValue:    number | null   // null = suppress this point in chart (gap)
  confidenceValue:  number | null
  confidenceBand:   ConfidenceBand | null
  isSupressed:      boolean
  suppressionReason: string | null
}

export async function getPropertyFanScoreSeries(
  propertyId: string,
  days = 90,
): Promise<{ modelVersion: string; series: ScorePoint[] }> {
  if (days < 1 || days > 365) throw new Error('[SponsorAI:getPropertyFanScoreSeries] days must be 1..365')

  const { data, error } = await supabase
    .from('fanscore_daily')
    .select('metric_date, fanscore_value, confidence_value, confidence_band, suppression_reason')
    .eq('property_id', propertyId)
    .eq('model_version', MODEL_VERSION)
    .gte('metric_date', new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10))
    .order('metric_date', { ascending: true })

  const rows = assertData(data, error, 'getPropertyFanScoreSeries')

  const series: ScorePoint[] = rows.map(r => ({
    date:             r.metric_date as string,
    // Treat suppressed rows as null for charting (render as gap)
    fanscoreValue:    r.suppression_reason !== null ? null : toNum(r.fanscore_value as string),
    confidenceValue:  toNum(r.confidence_value as string),
    confidenceBand:   r.confidence_band as ConfidenceBand | null,
    isSupressed:      r.suppression_reason !== null,
    suppressionReason: r.suppression_reason as string | null,
  }))

  return { modelVersion: MODEL_VERSION, series }
}

// ---------------------------------------------------------------------------
// 4.  getCompare
// ---------------------------------------------------------------------------

export interface CompareItem {
  propertyId:   string
  propertyName: string
  propertyType: PropertyType
  country:      string | null
  asOfDay:      string
  modelVersion: string
  win30d:       WindowSnapshot
  avgScore90d:  number | null
  trendValue90d: number | null
  sparkline:    ScorePoint[]  // last 30 days
}

export async function getCompare(propertyIds: string[]): Promise<CompareItem[]> {
  if (!propertyIds.length) throw new Error('[SponsorAI:getCompare] propertyIds must not be empty')
  if (propertyIds.length > 3) throw new Error('[SponsorAI:getCompare] max 3 properties for compare')

  // Query 1: snapshots from view
  const { data: snapData, error: snapError } = await supabase
    .from('v_property_summary_current')
    .select(`
      property_id, property_name, property_type, country,
      as_of_day, model_version,
      avg_score_30d, median_score_30d, trend_value_30d, volatility_value_30d,
      completeness_pct_30d, confidence_band_30d, confidence_value_30d, suppression_reason_30d,
      avg_score_90d, trend_value_90d
    `)
    .in('property_id', propertyIds)

  const snaps = assertData(snapData, snapError, 'getCompare:snapshot')

  // Guard: all requested properties must be present
  const foundIds = new Set(snaps.map(r => r.property_id as string))
  const missing  = propertyIds.filter(id => !foundIds.has(id))
  if (missing.length) {
    throw new Error(`[SponsorAI:getCompare] properties not found: ${missing.join(', ')}`)
  }

  // Query 2: sparklines (last 30 days) for all requested properties in one call
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)

  const { data: sparkData, error: sparkError } = await supabase
    .from('fanscore_daily')
    .select('property_id, metric_date, fanscore_value, confidence_value, confidence_band, suppression_reason')
    .in('property_id', propertyIds)
    .eq('model_version', MODEL_VERSION)
    .gte('metric_date', thirtyDaysAgo)
    .order('property_id')
    .order('metric_date', { ascending: true })

  const sparks = assertData(sparkData, sparkError, 'getCompare:sparklines')

  // Group sparklines by property_id
  const sparkByProp = new Map<string, ScorePoint[]>()
  for (const r of sparks) {
    const pid = r.property_id as string
    if (!sparkByProp.has(pid)) sparkByProp.set(pid, [])
    sparkByProp.get(pid)!.push({
      date:              r.metric_date as string,
      fanscoreValue:     r.suppression_reason !== null ? null : toNum(r.fanscore_value as string),
      confidenceValue:   toNum(r.confidence_value as string),
      confidenceBand:    r.confidence_band as ConfidenceBand | null,
      isSupressed:       r.suppression_reason !== null,
      suppressionReason: r.suppression_reason as string | null,
    })
  }

  // Preserve the caller's requested order
  const snapMap = new Map(snaps.map(r => [r.property_id as string, r]))

  return propertyIds.map(pid => {
    const v = snapMap.get(pid)! as Record<string, unknown>
    return {
      propertyId:    v.property_id as string,
      propertyName:  v.property_name as string,
      propertyType:  v.property_type as PropertyType,
      country:       v.country as string | null,
      asOfDay:       v.as_of_day as string,
      modelVersion:  v.model_version as string,
      win30d:        toWin(v, '30d'),
      avgScore90d:   toNum(v.avg_score_90d as string),
      trendValue90d: toNum(v.trend_value_90d as string),
      sparkline:     sparkByProp.get(pid) ?? [],
    }
  })
}

// ---------------------------------------------------------------------------
// Usage examples (remove before production)
// ---------------------------------------------------------------------------

/*
// Explore Grid
const cards = await getExploreGrid({ limit: 24 })
cards.forEach(c => {
  console.log(c.propertyName, c.propertyType, c.win30d.avgScore, c.win30d.confidenceBand)
})

// Property Detail
const detail = await getPropertyDetail('02a0c185-7fcc-4297-839a-1c1861514ff7')
console.log(detail.win30d, detail.latestScore?.components)

// Time series
const { modelVersion, series } = await getPropertyFanScoreSeries('02a0c185-7fcc-4297-839a-1c1861514ff7', 90)
series.forEach(pt => {
  if (pt.isSupressed) console.log(pt.date, 'SUPPRESSED:', pt.suppressionReason)
  else console.log(pt.date, pt.fanscoreValue, pt.confidenceBand)
})

// Compare
const compare = await getCompare([
  '02a0c185-7fcc-4297-839a-1c1861514ff7',
  '0a27191c-e568-44c5-abf4-7a75bbf4d0cd',
])
compare.forEach(c => {
  console.log(c.propertyName, c.win30d.avgScore, '30d sparkline points:', c.sparkline.length)
})
*/
