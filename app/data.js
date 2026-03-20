/* ── Config (API_URL, API_KEY loaded from config.js) ─────────────────── */
var MODEL = 'v1.0';

/* ── Demo mode ────────────────────────────────────────────────────────── */
/* When true, data.js fetches from demo views (v_property_summary_demo,   */
/* v_fanscore_daily_demo) which blend real + synthetic 90-day history.     */
/* Toggle via localStorage.sai_demo_mode = 'true' / 'false'.              */
/* The Dev nav provides the toggle button. Real data is never altered.     */
var DEMO_MODE = (function() {
  try { return localStorage.getItem('sai_demo_mode') === 'true'; }
  catch(e) { return false; }
}());

function countryFlag(code) {
  if (!code) return '';
  var aliases = { UK:'GB', ENG:'GB', SCO:'GB', WAL:'GB', NIR:'GB' };
  var c = code.trim().toUpperCase();
  c = aliases[c] || c;
  if (c.length !== 2) return '';
  return String.fromCodePoint(c.charCodeAt(0)+127397, c.charCodeAt(1)+127397);
}

function apiFetch(path) {
  return fetch(API_URL + path, {
    headers: { 'apikey': API_KEY, 'Authorization': 'Bearer ' + API_KEY }
  }).then(function(r) {
    if (!r.ok) return r.json().then(function(e){ throw new Error(e.message || r.statusText); });
    return r.json();
  });
}

/* ── State ───────────────────────────────────────────────────────────── */
var allCards     = [];
var activeFilter = 'all';

/* ── Type config (uses CSS variables for dark mode compatibility) ─────── */
var TYPE = {
  driver:         { label:'Driver',         bgVar:'var(--driver-bg)',  fgVar:'var(--driver-fg)',  scoreVar:'var(--driver-score)',  softVar:'var(--driver-soft)'  },
  athlete:        { label:'Athlete',        bgVar:'var(--driver-bg)',  fgVar:'var(--driver-fg)',  scoreVar:'var(--driver-score)',  softVar:'var(--driver-soft)'  },
  team:           { label:'Team',           bgVar:'var(--team-bg)',    fgVar:'var(--team-fg)',    scoreVar:'var(--team-score)',    softVar:'var(--team-soft)'    },
  series:         { label:'Series',         bgVar:'var(--series-bg)',  fgVar:'var(--series-fg)',  scoreVar:'var(--series-score)',  softVar:'var(--series-soft)'  },
  event:          { label:'Event',          bgVar:'var(--event-bg)',   fgVar:'var(--event-fg)',   scoreVar:'var(--event-score)',   softVar:'var(--event-soft)'   },
  venue:          { label:'Venue',          bgVar:'var(--surface-muted)', fgVar:'var(--text-2)', scoreVar:'var(--text-2)',         softVar:'var(--accent)'       },
  governing_body: { label:'Governing Body', bgVar:'var(--surface-muted)', fgVar:'var(--text-2)', scoreVar:'var(--text-2)',         softVar:'var(--accent)'       },
};

/* ── Utilities ────────────────────────────────────────────────────────── */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function n(v)      { if (v==null) return null; var x=Number(v); return isNaN(x)?null:x; }
function fmt(v,dp) { if (v==null) return '--'; return Number(v).toFixed(dp!=null?dp:1); }
function fmtScore(v) { if (v==null) return '--'; return String(Math.round(Number(v))); }
function arr(v)    { return v==null?'':v>0.1?'\u2191':v<-0.1?'\u2193':'\u2192'; }
function arrC(v)   { return v==null?'var(--text-3)':v>0.1?'var(--positive)':v<-0.1?'var(--negative)':'var(--text-3)'; }
function fmtFollowers(v) {
  if (v==null) return null; var x=Number(v); if(isNaN(x)||x<=0) return null;
  if(x>=1000000) return (x/1000000).toFixed(1)+'M';
  if(x>=100000)  return Math.round(x/1000)+'k';
  if(x>=1000)    return (x/1000).toFixed(1)+'k';
  return String(Math.round(x));
}
/* ── DB-registered images (entity_images, verified=true) ──────────────── */
/* Populated by loadEntityImages() at grid-load time.
   Keys are property slugs; values are { src } objects.
   Takes priority over images.js in resolveImageMeta.

   Source priority (recorded on each row as source_type):
     1. redbull_api   — official Red Bull CMS API (canonical; highest trust)
     2. manual        — official site scrape or hand-verified insert
     3. scan          — semi-automated scan (e.g. Wikipedia / Wikimedia)
     4. other/legacy  — Excel imports or ad-hoc inserts (lowest trust)
   Resolver does not filter by source_type; instead it relies on created_at
   ordering (asc) so the most recently inserted row wins per slug. This means
   a redbull_api insert added after a legacy manual row will automatically
   take precedence without any deletion of historical data.

   Newcastle Red Bulls note:
   Images for this team are sourced from the official Red Bull CMS API feed:
     https://www.newcastleredbulls.com/v3/api/graphql/v1/v3/feed/en-INT
       ?filter[type]=person-profiles&page[limit]=60&rb3Schema=v1:cardList
   Transform applied: c_fill,g_auto,w_300,h_300/q_auto,f_auto
   This is the authoritative source. Do not replace with Excel or ad-hoc URLs. */
var ENTITY_IMAGES_DB = {};

/* Fetch verified entity_images from Supabase and populate ENTITY_IMAGES_DB.
   Uses a PostgREST nested select to join properties(slug) without a view.
   Order: created_at asc so newest insert wins when a property has multiple images
   (e.g. player who moved teams, or legacy Excel row superseded by API row). */
function loadEntityImages() {
  return apiFetch(
    '/entity_images?select=image_url,properties(slug,property_type)&verified=eq.true&order=created_at.asc&limit=2000'
  ).then(function(rows) {
    var map = {};
    (rows || []).forEach(function(r) {
      var p = r.properties;
      if (p && p.slug) {
        map[p.slug] = { src: r.image_url, property_type: p.property_type };
      }
    });
    return map;
  }).catch(function() {
    /* Non-fatal: fall through to images.js on any fetch error */
    return {};
  });
}

/* ── Image metadata resolver ──────────────────────────────────────────── */
/* Resolution order:
   1. entity_images (DB, verified=true) — newest row per slug wins (created_at asc)
      source_type priority: redbull_api > manual > scan > other
      (priority is enforced by insert order, not by query filtering)
   2. PROPERTY_IMAGES (images.js)       — static hand-curated registry
   3. EVENT_VENUE_MAP fallback for events
   4. null                              — card renders hero placeholder icon

   Entry format in PROPERTY_IMAGES (images.js):
     { src, kind, fit, pos, pad?, bg? }
   Plain-string entries are treated as cover photos (backward compat).
   entity_images entries infer kind from property_type. */
function resolveImageMeta(slug, propertyType) {
  /* ── 1. DB-registered image (entity_images, verified=true) ── */
  var dbEntry = ENTITY_IMAGES_DB[slug];
  if (dbEntry) {
    /* Infer display kind from property_type */
    var kindMap = {
      athlete:        'portrait',
      team:           'logo',
      venue:          'venue',
      series:         'series',
      governing_body: 'logo',
      event:          'venue'
    };
    var pType = propertyType || dbEntry.property_type || '';
    var kind  = kindMap[pType] || 'photo';
    var isCover     = kind === 'portrait' || kind === 'venue' || kind === 'photo';
    var isContained = kind === 'logo'     || kind === 'series';
    return {
      url:  dbEntry.src,
      kind: kind,
      fit:  isCover ? 'cover' : 'contain',
      pos:  kind === 'portrait' ? 'center top' : 'center center',
      pad:  isContained ? '14%' : null,
      bg:   isContained ? 'var(--surface-muted)' : null
    };
  }

  /* ── 2 & 3. Static images.js registry (with event fallback) ── */
  var entry = PROPERTY_IMAGES[slug];
  if (!entry && propertyType === 'event' && EVENT_VENUE_MAP[slug]) {
    entry = PROPERTY_IMAGES[EVENT_VENUE_MAP[slug]];
  }
  if (!entry) return null;
  if (typeof entry === 'string') {
    /* Legacy plain-string — treat as cover photo */
    return { url: entry, kind: 'photo', fit: 'cover', pos: 'center center', pad: null, bg: null };
  }
  return {
    url:  entry.src,
    kind: entry.kind  || 'photo',
    fit:  entry.fit   || 'cover',
    pos:  entry.pos   || 'center center',
    pad:  entry.pad   || null,
    bg:   entry.bg    || null
  };
}

function renderSpark(sparks, stroke, w, h) {
  if (!sparks || sparks.length < 2) return '';
  var vals = sparks.map(function(p){ return p.v; });
  var nonNull = vals.filter(function(v){ return v != null; });
  if (nonNull.length < 2) return '';
  var min = Math.min.apply(null, nonNull);
  var max = Math.max.apply(null, nonNull);
  var range = (max - min) || 1;
  var pad = 2;
  var n = vals.length;
  /* Build path segments — break on null gaps */
  var segs = []; var cur = [];
  vals.forEach(function(v, i) {
    if (v == null) { if (cur.length >= 2) segs.push(cur); cur = []; return; }
    var x = pad + (i / Math.max(n - 1, 1)) * (w - pad * 2);
    var y = pad + (1 - (v - min) / range) * (h - pad * 2);
    cur.push(x.toFixed(1) + ',' + y.toFixed(1));
  });
  if (cur.length >= 2) segs.push(cur);
  if (!segs.length) return '';
  var lines = segs.map(function(pts) {
    return '<polyline points="' + pts.join(' ')
      + '" fill="none" stroke="' + stroke
      + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }).join('');
  return '<svg class="spark-svg" viewBox="0 0 ' + w + ' ' + h
    + '" preserveAspectRatio="none">' + lines + '</svg>';
}

function loadPosts(propertyId) {
  var cols = 'post_id,platform,posted_at,content_type,caption,is_viral,'
    + 'total_likes,total_comments,total_shares,total_impressions';
  return apiFetch('/v_property_posts?property_id=eq.' + propertyId
    + '&select=' + cols
    + '&order=posted_at.desc&limit=5');
}

/* ── Relationship fetch ───────────────────────────────────────────────── */
function loadRelationships(propertyId) {
  var cols = 'from_id,to_id,relationship_type';
  return Promise.all([
    apiFetch('/property_relationships?from_id=eq.' + propertyId + '&select=' + cols),
    apiFetch('/property_relationships?to_id=eq.'   + propertyId + '&select=' + cols)
  ]).then(function(res) {
    var fwd = (res[0] || []).map(function(r) {
      return { relatedId: r.to_id,   type: r.relationship_type, dir: 'forward' };
    });
    var rev = (res[1] || []).map(function(r) {
      return { relatedId: r.from_id, type: r.relationship_type, dir: 'reverse' };
    });
    return { forward: fwd, reverse: rev };
  });
}

/* ── FanScore availability helpers ───────────────────────────────────── */

/**
 * Derive an approximate day-count of valid data coverage from completeness_pct.
 * completeness_pct_30d = (days_with_data / 30) * 100, so days ≈ pct * 30 / 100.
 * Returns null when cov30 is null (no window data at all).
 */
function deriveCoverageDays(cov30) {
  if (cov30 == null) return null;
  return Math.max(1, Math.round(Number(cov30) * 30 / 100));
}

/**
 * Return a short, calm, trust-first reason string for the confidence band.
 * Designed for the UI helper copy below the confidence label.
 * Never implies the score is unreliable — just explains its basis.
 */
function deriveConfidenceReason(conf30, coverageDays, platforms) {
  if (!conf30) return null;
  var platCount = (platforms && platforms.length) ? platforms.length : null;
  var platPart  = platCount ? (' across ' + platCount + ' platform' + (platCount === 1 ? '' : 's')) : '';
  var band = conf30.toLowerCase();
  if (band === 'high') {
    return 'Based on 30+ days of signal' + platPart;
  }
  if (band === 'medium') {
    var dayLabel = coverageDays ? coverageDays + ' days' : 'limited days';
    return 'Based on ' + dayLabel + ' of signal' + platPart;
  }
  /* Low */
  if (coverageDays && coverageDays > 1) {
    return 'Early signal — ' + coverageDays + ' day' + (coverageDays === 1 ? '' : 's') + ' of data' + platPart;
  }
  return 'Early signal' + platPart;
}

/* ── Momentum signal computation ─────────────────────────────────────── */
function computeMomentumScore(c) {
  if (!c || c.sup30) return [];
  var badges = [];
  var t30       = c.t30            != null ? c.t30            : null;
  var eng       = c.engRate30d     != null ? c.engRate30d     : null;
  var delta     = c.followersDelta != null ? c.followersDelta : null;
  var followers = c.followers      != null ? c.followers      : null;
  /* Trend signals — highest priority */
  if (t30 !== null && t30 > 3.0)   { badges.push('Rising Fast'); }
  else if (t30 !== null && t30 > 1.0)  { badges.push('Growing'); }
  else if (t30 !== null && t30 < -1.5) { badges.push('Losing Momentum'); }
  /* Engagement signals — secondary */
  if (badges.length < 2 && eng !== null && eng > 5.0) {
    badges.push('High Engagement');
  }
  if (badges.length < 2 && delta !== null && followers !== null && followers > 0 && (delta / followers) > 0.05) {
    badges.push('Audience Surge');
  }
  return badges;
}

/* ── Data fetch ───────────────────────────────────────────────────────── */
function loadGrid() {
  /* Pre-load DB-registered images so resolveImageMeta can use them.
     Failure is non-fatal: ENTITY_IMAGES_DB stays empty, images.js takes over. */
  var imgPromise = loadEntityImages().then(function(map) {
    ENTITY_IMAGES_DB = map;
  }).catch(function() {
    ENTITY_IMAGES_DB = {};
  });

  var cols='property_id,property_name,property_type,country,bio,as_of_day,model_version,'
    +'avg_score_30d,trend_value_30d,volatility_value_30d,completeness_pct_30d,confidence_band_30d,suppression_reason_30d,'
    +'avg_score_60d,avg_score_90d,trend_value_90d,'
    +'team_ids,team_names,driver_ids,driver_names,slug,'
    +'total_followers_latest,followers_net_30d,posts_30d,total_interactions_30d,engagement_rate_30d_pct,platforms_active,'
    +'sport,region,city';

  return imgPromise.then(function() {
  /* Demo mode: switch to demo views that blend real + synthetic history. */
  var summaryView = DEMO_MODE ? '/v_property_summary_demo' : '/v_property_summary_current';
  return apiFetch(summaryView+'?select='+cols
    +'&visible_in_ui=eq.true'
    +'&order=property_name.asc&limit=200')
    .then(function(rows){
      var ids=rows.map(function(r){return r.property_id;});
      var since=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
      var idList=ids.join(',');
      /* Demo spark source: v_fanscore_daily_demo unions real v2.0 + synthetic rows. */
      /* Production spark source: fanscore_daily filtered to v1.0 (historical data). */
      var sparkPath = DEMO_MODE
        ? '/v_fanscore_daily_demo'
            +'?select=property_id,metric_date,fanscore_value,suppression_reason'
            +'&property_id=in.('+idList+')'
            +'&metric_date=gte.'+since
            +'&order=property_id.asc,metric_date.asc'
            +'&limit=5000'
        : '/fanscore_daily'
            +'?select=property_id,metric_date,fanscore_value,suppression_reason'
            +'&property_id=in.('+idList+')'
            +'&model_version=eq.'+MODEL
            +'&metric_date=gte.'+since
            +'&order=property_id.asc,metric_date.asc'
            +'&limit=5000';
      return apiFetch(sparkPath)
        .then(function(sparkData){
          var sparkMap={};
          (sparkData||[]).forEach(function(r){
            (sparkMap[r.property_id]=sparkMap[r.property_id]||[]).push({
              d:r.metric_date,
              v:r.suppression_reason?null:n(r.fanscore_value)
            });
          });
          return rows.map(function(r){
            var slug    = r.slug || null;
            var imgMeta = resolveImageMeta(slug, r.property_type);
            var _sparks     = sparkMap[r.property_id] || [];
            var _platforms  = r.platforms_active || null;
            var _s30        = n(r.avg_score_30d);
            var _sup30      = r.suppression_reason_30d;
            var _conf30     = r.confidence_band_30d;
            var _cov30      = n(r.completeness_pct_30d);
            var _covDays    = deriveCoverageDays(_cov30);
            var _card = {
              id:r.property_id, name:r.property_name, type:r.property_type, country:r.country,
              bio:r.bio||null,
              slug:slug,
              asOf:r.as_of_day, model:r.model_version,
              s30:_s30, s60:n(r.avg_score_60d), s90:n(r.avg_score_90d),
              t30:n(r.trend_value_30d), t90:n(r.trend_value_90d),
              vol30:n(r.volatility_value_30d),
              cov30:_cov30, conf30:_conf30,
              sup30:_sup30,
              sparks:_sparks,
              teamIds:r.team_ids||null, teamNames:r.team_names||null,
              driverIds:r.driver_ids||null, driverNames:r.driver_names||null,
              image_url:imgMeta ? imgMeta.url : null,  /* kept for backward compat */
              imageMeta:imgMeta,
              followers:n(r.total_followers_latest),
              followersDelta:n(r.followers_net_30d),
              posts30d:n(r.posts_30d),
              interactions30d:n(r.total_interactions_30d),
              engRate30d:n(r.engagement_rate_30d_pct),
              platforms:_platforms,
              sport:r.sport||null,
              region:r.region||null,
              city:r.city||null,
              /* ── FanScore availability fields ──────────────────────────────────
                 Derived from the raw window data. Used by cards, panels, and the
                 property page to explain confidence without hiding valid scores.
                 Never fabricated — all values come from real DB rows.          */
              fanScoreStatus: (_s30 != null && !_sup30) ? 'available'
                            : _sup30                    ? 'insufficient_data'
                            :                            'not_available',
              coverageDays:   _covDays,
              confidenceReason: deriveConfidenceReason(_conf30, _covDays, _platforms),
              /* Trend/history visuals require >= 2 valid spark points.
                 Score availability is independent of trend availability. */
              hasEnoughDataForTrend: (_sparks.filter(function(p){ return p.v != null; }).length >= 2)
            };
            /* Trust rule: properties without social data are never penalised.
               Absence of a signal is not a negative signal.
               s30 == null and sup30 == null is a valid state — rendered as
               "Not available" by the card and compare views. Do not fabricate. */
            return _card;
          });
        });
    });
  }); /* closes imgPromise.then */
}
