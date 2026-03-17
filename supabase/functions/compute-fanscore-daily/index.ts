/* ── compute-fanscore-daily ───────────────────────────────────────────────────
   FanScore v2.0 compute function.

   Reads from: social_rollups_daily (live X / YouTube / Instagram / TikTok data)
   Writes to:  fanscore_daily        (one row per property per day, model v2.0)
               fanscore_windows      (30/60/90d aggregates, via SQL function)

   Scheduling: run daily via pg_cron, AFTER ingest + rollup pipelines complete.

   ── Formula (v2.0) ──────────────────────────────────────────────────────────

   FanScore = (
     0.40 × audience_component   +   // Absolute reach (log-scale)
     0.35 × momentum_component   +   // Growth + activity signal
     0.25 × coverage_component       // Platform breadth bonus
   ) × 100

   All components are in [0, 1]. Final score is in [0, 100], 3dp.

   Confidence is reported ALONGSIDE the score — it does not multiply or
   deflate the score. This keeps the number stable; confidence tells the
   reader how much to trust it.

   ── Component details ───────────────────────────────────────────────────────

   audience_component
     log10(total_followers + 1) / log10(10_000_000)
     Reference: 1k→0.29, 10k→0.43, 100k→0.57, 1M→0.71, 10M→1.00
     Capped at 1.0. Source: followers_count from social_rollups_daily.

   momentum_component
     Source: momentum_score_30d (0–100) from social_rollups_daily, normalised.
     If followers_delta_30d IS NULL (not enough history): neutral = 0.50.
       Rationale: absence of growth history is not negative — do not penalise
       a property for being new in the system.
     If delta IS available: weighted avg momentum across platforms by followers.

   coverage_component
     1 active platform: 0.50
     2 platforms:       0.75
     3+ platforms:      1.00
     Rewards breadth of verified data signals.

   ── Confidence ──────────────────────────────────────────────────────────────

   Confidence band maps to coverage_confidence from social_rollups_daily:
     Low    → 0.35  (< 7 days of snapshot history)
     Medium → 0.65  (7–29 days)
     High   → 0.90  (30+ days)

   Conservative rule: if ANY platform is Low, overall = Low.
   Confidence evolves naturally as snapshot history accumulates.

   ── Suppression ─────────────────────────────────────────────────────────────

   A property is SUPPRESSED (fanscore_value = null) when:
     - No social_rollups_daily rows exist for this property.
   A suppressed property gets: suppression_reason = 'No social data'.
   The UI renders this as "Not available" — not as 0 or missing.

   ── Legacy phase-out ────────────────────────────────────────────────────────

   v1.0 rows in fanscore_daily remain intact (not deleted).
   v_active_model is switched to v2.0 via migration 20260318000006.
   v_property_summary_current reads from the active model only.
   Once v2.0 has 30+ days of history, the v1.0 rows can be archived.

   ── Multi-platform note ──────────────────────────────────────────────────────

   Currently only X (Twitter) platform data is live in social_rollups_daily.
   YouTube snapshots exist but are routed through social_account_snapshots,
   not yet through the rollup pipeline.
   When additional platform rollups are added, this function picks them up
   automatically — no code change required, only rollup rows needed.

────────────────────────────────────────────────────────────────────────────── */

import { serve }         from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2';

// ── Model constants ───────────────────────────────────────────────────────────

const MODEL_VERSION = 'v2.0';

// Component weights — must sum to 1.0
const W_AUDIENCE = 0.40;  // Absolute reach (stable from day 1)
const W_MOMENTUM = 0.35;  // Growth + activity (builds value over time)
const W_COVERAGE = 0.25;  // Platform breadth (rewards multi-platform presence)

// Log-scale ceiling: 10M followers = audience_component of 1.0
const AUDIENCE_LOG_MAX = Math.log10(10_000_000);

// Minimum follower count to generate a non-trivial audience signal
const MIN_FOLLOWERS_THRESHOLD = 50;

// Confidence band → numeric value mapping
const CONFIDENCE_VALUES: Record<string, number> = {
  High:   0.90,
  Medium: 0.65,
  Low:    0.35,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface RollupRow {
  property_id:          string;
  platform:             string;
  as_of_date:           string;
  followers_count:      number | null;
  followers_delta_30d:  number | null;
  momentum_score_30d:   number | null;
  coverage_confidence:  string | null;
}

interface FanScoreRow {
  property_id:       string;
  metric_date:       string;
  model_version:     string;
  fanscore_value:    number | null;
  confidence_band:   string | null;
  confidence_value:  number | null;
  suppression_reason: string | null;
  components_json:   object | null;
  reasons:           string[];
  computed_at:       string;
}

// ── Component functions ───────────────────────────────────────────────────────

/**
 * Audience size component — log-scale normalised.
 * Represents absolute reach across all connected platforms.
 */
function audienceComponent(totalFollowers: number): number {
  if (totalFollowers < MIN_FOLLOWERS_THRESHOLD) return 0;
  return Math.min(Math.log10(totalFollowers + 1) / AUDIENCE_LOG_MAX, 1.0);
}

/**
 * Momentum component — growth + activity signal.
 *
 * When followers_delta_30d is null for ALL platforms (insufficient history),
 * returns 0.50 (neutral). This is the trust rule in action: absence of data
 * is not a negative signal.
 *
 * When delta data IS available, computes a follower-weighted average of
 * momentum_score_30d (0–100 scale from rollup compute).
 */
function momentumComponent(rollups: RollupRow[]): { value: number; hasHistory: boolean } {
  const withDelta = rollups.filter(r => r.followers_delta_30d != null);

  if (withDelta.length === 0) {
    // No 30-day growth window yet — neutral, not penalised
    return { value: 0.50, hasHistory: false };
  }

  // Follower-weighted average of momentum scores
  let weightedSum = 0;
  let totalWeight = 0;

  for (const r of withDelta) {
    const weight   = Math.max(r.followers_count ?? 1, 1);
    const momentum = Math.min((r.momentum_score_30d ?? 0) / 100, 1.0);
    weightedSum += momentum * weight;
    totalWeight += weight;
  }

  const value = totalWeight > 0 ? weightedSum / totalWeight : 0.50;
  return { value, hasHistory: true };
}

/**
 * Coverage component — platform breadth bonus.
 * Rewards properties with verified data across multiple platforms.
 */
function coverageComponent(platformCount: number): number {
  if (platformCount <= 0) return 0;
  if (platformCount === 1) return 0.50;
  if (platformCount === 2) return 0.75;
  return 1.0;
}

/**
 * Confidence — conservative across platforms.
 * Uses the lowest confidence level present in the rollup set.
 * Maps coverage_confidence string → band + numeric value.
 */
function computeConfidence(rollups: RollupRow[]): { band: string; value: number } {
  const levels = rollups.map(r => r.coverage_confidence ?? 'Low');

  const band = levels.includes('Low')    ? 'Low'
             : levels.includes('Medium') ? 'Medium'
             : 'High';

  return { band, value: CONFIDENCE_VALUES[band] };
}

// ── FanScore compute ──────────────────────────────────────────────────────────

/**
 * Computes FanScore v2.0 for a single property.
 *
 * Returns a suppressed row (fanscore_value = null) if the property has
 * no social_rollups_daily data — absence is never treated as 0.
 */
function computeFanScore(
  propertyId: string,
  rollups: RollupRow[],
  today: string,
): FanScoreRow {
  const base = {
    property_id:  propertyId,
    metric_date:  today,
    model_version: MODEL_VERSION,
    computed_at:  new Date().toISOString(),
  };

  // ── Suppression: no social data ──────────────────────────────────────────
  if (rollups.length === 0) {
    return {
      ...base,
      fanscore_value:     null,
      confidence_band:    null,
      confidence_value:   null,
      suppression_reason: 'No social data',
      components_json:    null,
      reasons: ['No connected social platform data for this property'],
    };
  }

  // ── Signal extraction ────────────────────────────────────────────────────
  const totalFollowers = rollups.reduce((sum, r) => sum + (r.followers_count ?? 0), 0);
  const platformCount  = new Set(rollups.map(r => r.platform)).size;

  const cAudience        = audienceComponent(totalFollowers);
  const { value: cMomentum, hasHistory } = momentumComponent(rollups);
  const cCoverage        = coverageComponent(platformCount);

  // ── Score formula ────────────────────────────────────────────────────────
  const scoreRaw = W_AUDIENCE * cAudience + W_MOMENTUM * cMomentum + W_COVERAGE * cCoverage;
  const score    = Math.round(Math.min(Math.max(scoreRaw * 100, 0), 100) * 1000) / 1000;

  const { band, value: confValue } = computeConfidence(rollups);

  // ── Explainability reasons ────────────────────────────────────────────────
  const reasons: string[] = [
    `Audience: ${totalFollowers.toLocaleString()} followers across ${platformCount} platform(s) — score component ${Math.round(cAudience * 100)}/100`,
    hasHistory
      ? `Momentum: ${Math.round(cMomentum * 100)}/100 (30d growth data available)`
      : `Momentum: neutral (no 30-day delta history yet — not penalised)`,
    `Coverage: ${platformCount} platform(s) — component ${Math.round(cCoverage * 100)}/100`,
    `Confidence: ${band} (${rollups.map(r => r.coverage_confidence ?? 'Low').join(', ')})`,
  ];

  return {
    ...base,
    fanscore_value:     score,
    confidence_band:    band,
    confidence_value:   confValue,
    suppression_reason: null,
    components_json: {
      model_version: MODEL_VERSION,
      weights: { audience: W_AUDIENCE, momentum: W_MOMENTUM, coverage: W_COVERAGE },
      components: {
        audience: {
          raw:           cAudience,
          total_followers: totalFollowers,
          description:   'log10-normalised follower count (10M = max)',
        },
        momentum: {
          raw:         cMomentum,
          has_history: hasHistory,
          description: hasHistory
            ? 'follower-weighted momentum_score_30d from rollup'
            : 'neutral (0.5) — no 30d delta history, not penalised',
        },
        coverage: {
          raw:            cCoverage,
          platform_count: platformCount,
          platforms:      [...new Set(rollups.map(r => r.platform))],
          description:    '1 platform=0.5, 2=0.75, 3+=1.0',
        },
      },
      score_raw:   scoreRaw,
      score_final: score,
    },
    reasons,
  };
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const today = new Date().toISOString().split('T')[0];

    console.log(`[compute-fanscore-daily] Starting v2.0 compute for ${today}`);

    // 1. Fetch all social rollups for today
    //    Only the current day's rollup is needed — rollup rows are already
    //    the aggregate over the snapshot history window.
    const { data: rollups, error: rollupErr } = await supabase
      .from('social_rollups_daily')
      .select([
        'property_id',
        'platform',
        'as_of_date',
        'followers_count',
        'followers_delta_30d',
        'momentum_score_30d',
        'coverage_confidence',
      ].join(','))
      .eq('as_of_date', today);

    if (rollupErr) throw new Error(`Rollup fetch failed: ${rollupErr.message}`);

    const todayRollups = (rollups ?? []) as RollupRow[];
    console.log(`[compute-fanscore-daily] Loaded ${todayRollups.length} rollup rows`);

    // 2. Fetch all visible properties
    const { data: properties, error: propErr } = await supabase
      .from('properties')
      .select('id')
      .eq('visible_in_ui', true);

    if (propErr) throw new Error(`Properties fetch failed: ${propErr.message}`);

    // 3. Group rollups by property_id
    const rollupsByProperty = new Map<string, RollupRow[]>();
    for (const r of todayRollups) {
      if (!rollupsByProperty.has(r.property_id)) {
        rollupsByProperty.set(r.property_id, []);
      }
      rollupsByProperty.get(r.property_id)!.push(r);
    }

    // 4. Compute FanScore for every visible property
    const results: FanScoreRow[] = (properties ?? []).map(p => {
      const propRollups = rollupsByProperty.get(p.id) ?? [];
      return computeFanScore(p.id, propRollups, today);
    });

    const scored     = results.filter(r => r.fanscore_value != null).length;
    const suppressed = results.filter(r => r.suppression_reason != null).length;

    console.log(`[compute-fanscore-daily] Computed ${scored} scores, ${suppressed} suppressed`);

    // 5. Upsert into fanscore_daily
    //    On conflict (property_id, metric_date, model_version): update.
    const { error: upsertErr } = await supabase
      .from('fanscore_daily')
      .upsert(results, {
        onConflict: 'property_id,metric_date,model_version',
      });

    if (upsertErr) throw new Error(`fanscore_daily upsert failed: ${upsertErr.message}`);

    console.log(`[compute-fanscore-daily] Upserted ${results.length} rows to fanscore_daily`);

    // 6. Compute rolling window aggregates (30d / 60d / 90d)
    //    Delegates to a PostgreSQL function for efficiency —
    //    SQL-side aggregation avoids round-tripping all rows.
    const { error: windowErr } = await supabase.rpc(
      'compute_fanscore_windows_v2',
      { p_model_version: MODEL_VERSION, p_as_of_day: today },
    );

    if (windowErr) throw new Error(`Window compute failed: ${windowErr.message}`);

    console.log(`[compute-fanscore-daily] Window aggregates updated`);

    return new Response(
      JSON.stringify({
        success:     true,
        model:       MODEL_VERSION,
        date:        today,
        total:       results.length,
        scored,
        suppressed,
        message: `FanScore v2.0 computed for ${today}: ${scored} scored, ${suppressed} suppressed`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[compute-fanscore-daily] Fatal error: ${msg}`);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
