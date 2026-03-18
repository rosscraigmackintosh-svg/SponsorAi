/* ── Detail panel ────────────────────────────────────────────────────────
   Depends on globals from data.js:    allCards, TYPE, n, fmt, arr, arrC, countryFlag,
                                       escHtml
   Depends on globals from card.js:    HERO_ICONS
   Must load after components/layout.js and before the inline script block.
────────────────────────────────────────────────────────────────────────── */
var detailOpen      = false;
var detailCardId    = null;
var _savedScrollY   = 0;   /* restored when overlay closes */
var PLATFORM_LABELS = { instagram:'Instagram', x:'X', youtube:'YouTube', tiktok:'TikTok', linkedin:'LinkedIn' };

function openDetail(c) {
  _savedScrollY = window.scrollY || window.pageYOffset || 0;
  detailCardId  = c.id;
  populateDetail(c);
  detailOpen = true;
  document.body.classList.add('detail-open');
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('dp-scroll').scrollTop = 0;
}

function closeDetail() {
  detailOpen   = false;
  detailCardId = null;
  document.body.classList.remove('detail-open');
  document.getElementById('detail-panel').classList.remove('open');
  document.querySelectorAll('.fanscore-card').forEach(function(el) { el.classList.remove('selected'); });
  /* Restore scroll position so user lands back where they were */
  window.scrollTo({ top: _savedScrollY, behavior: 'instant' });
}

function populateDetail(c) {
  var cfg = TYPE[c.type] || { label: c.type, bgVar: 'var(--surface-muted)', fgVar: 'var(--text-2)', scoreVar: 'var(--text-1)', softVar: 'var(--accent)' };
  var sup    = !!c.sup30;
  /* Trust rule: noData = no score and no suppression reason. Never show 0 or '--'. */
  var noData = !sup && c.s30 == null;
  var scoreColor = (sup || noData) ? 'var(--text-3)' : (cfg.scoreVar || cfg.fgVar);

  /* ── Hero image ── */
  var heroEl = document.getElementById('dp-hero');
  var m = c.imageMeta;
  heroEl.style.background = (m && m.bg) ? m.bg : cfg.bgVar;
  var dpPlaceholder = '<div class="dp-hero-placeholder" style="color:' + cfg.fgVar + '">' + (HERO_ICONS[c.type] || HERO_ICONS.series) + '</div>';
  if (m) {
    var dpImgStyle = 'object-fit:' + m.fit + ';object-position:' + m.pos;
    if (m.pad) dpImgStyle += ';padding:' + m.pad + ';box-sizing:border-box';
    heroEl.innerHTML = '<img src="' + m.url + '" alt="' + escHtml(c.name) + '" data-img-kind="' + m.kind + '" style="' + dpImgStyle
      + '" onerror="this.style.display=\'none\';this.insertAdjacentHTML(\'afterend\',this.getAttribute(\'data-fallback\'))" data-fallback="' + escHtml(dpPlaceholder) + '">';
  } else {
    heroEl.innerHTML = dpPlaceholder;
  }

  var h = '';

  /* ───────────────────────────────────────────────────────────────
     1. HEADER — mirrors card layout: name + flag, type badge, context
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section dp-card-header">';
  /* Name row — name left, flag right (matches .card-name-row) */
  h += '<div class="dp-card-name-row">';
  h += '<div class="dp-card-name">' + escHtml(c.name) + '</div>';
  if (c.country) h += '<span class="dp-card-flag">' + countryFlag(c.country) + '</span>';
  h += '</div>';
  /* Type badge + team context on same sub-row */
  h += '<div class="dp-card-sub">';
  h += '<span class="type-badge" style="display:inline-flex;background:' + cfg.bgVar + ';color:' + cfg.fgVar + ';border-color:' + cfg.fgVar + '33">' + cfg.label + '</span>';
  var ctx = '';
  if      ((c.type === 'driver' || c.type === 'athlete') && c.teamNames && c.teamNames.length) ctx = c.teamNames[0];
  else if (c.type === 'team'   && c.driverNames && c.driverNames.length)                      ctx = c.driverNames.join(' \u00B7 ');
  if (ctx) h += '<span class="dp-card-context">' + escHtml(ctx) + '</span>';
  h += '</div>';
  h += '</div>'; /* /section */

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     2. HERO BLOCK — FanScore, confidence, short description, actions
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">FanScore</div>';
  if (noData) {
    h += '<div class="dp-score-primary"><span class="dp-score-val fanscore-no-data" style="color:var(--text-3)">Not available</span><span class="dp-score-label">FanScore</span></div>';
    h += '<div class="dp-conf" style="margin-top:var(--spacing-xs);color:var(--text-3)">No public social media data available</div>';
  } else if (sup) {
    h += '<div class="dp-score-primary"><span class="dp-score-val fanscore-no-data" style="color:var(--text-3)">Insufficient data</span><span class="dp-score-label">FanScore</span></div>';
    h += '<div class="dp-conf" style="margin-top:var(--spacing-xs)">' + escHtml(c.sup30) + '</div>';
  } else {
    h += '<div class="dp-score-primary">';
    h += '<span class="dp-score-val" style="color:' + scoreColor + '">' + fmtScore(c.s30) + '</span>';
    h += '<span class="dp-score-label">30-day average</span>';
    h += '</div>';
    if (c.t30 != null) h += '<div class="dp-trend" style="color:' + arrC(c.t30) + ';margin-bottom:var(--spacing-xs)">' + arr(c.t30) + '\u2009' + Math.abs(c.t30).toFixed(2) + '\u2009/\u2009day</div>';
    if (c.conf30) h += '<div class="dp-conf">' + c.conf30 + ' confidence</div>';
  }
  /* Short description */
  if (c.bio) {
    var shortDesc = c.bio.length > 160 ? c.bio.slice(0, 160).replace(/\s+\S+$/, '') + '\u2026' : c.bio;
    h += '<div style="font-size:var(--text-sm);color:var(--text-2);line-height:1.6;margin-top:var(--spacing-md)">' + escHtml(shortDesc) + '</div>';
  }
  /* Actions — reflect current saved state from SAI_STORAGE */
  var _slug      = c.slug || null;
  var _inWL      = _slug && typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.watchlist.has(_slug);
  var _inPF      = _slug && typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.portfolio.has(_slug);
  var _inCmp     = _slug && typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.compare.has(_slug);
  var _inBoard   = _slug && typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.board.isOnBoard(_slug);
  var _boardStage = _inBoard ? SAI_STORAGE.board.getSlugStage(_slug) : null;
  var _boardStageLbls = { watching:'Watching', shortlist:'Shortlist', evaluation:'Evaluating', confirmed:'Confirmed' };
  var _boardLabel = _inBoard ? (_boardStageLbls[_boardStage] || 'On board') : 'Add to Board';
  var _cmpCount  = typeof SAI_STORAGE !== 'undefined' ? SAI_STORAGE.compare.get().length : 0;
  var _cmpFull   = !_inCmp && _cmpCount >= 4;
  var _cmpLabel  = _inCmp   ? 'Comparing'
                 : _cmpFull ? 'Compare (full)'
                 : _cmpCount > 0 ? 'Compare (' + _cmpCount + '/4)' : 'Compare';
  h += '<div class="dp-actions">';
  h += '<button class="dp-action-btn' + (_inWL  ? ' active' : '') + '" id="dp-btn-watch"'
     + ' onclick="dpAction(\'watch\',\'' + c.id + '\')">'
     + (_inWL  ? 'Watching'     : 'Watch')     + '</button>';
  h += '<button class="dp-action-btn' + (_inPF  ? ' active' : '') + '" id="dp-btn-portfolio"'
     + ' onclick="dpAction(\'portfolio\',\'' + c.id + '\')">'
     + (_inPF  ? 'In portfolio' : 'Portfolio') + '</button>';
  h += '<button class="dp-action-btn' + (_inCmp ? ' active' : '') + '" id="dp-btn-compare"'
     + ' onclick="dpAction(\'compare\',\'' + c.id + '\')" data-slug="' + (_slug || '') + '">'
     + _cmpLabel + '</button>';
  h += '<button class="dp-action-btn' + (_inBoard ? ' active' : '') + '" id="dp-btn-board"'
     + ' onclick="dpAction(\'board\',\'' + c.id + '\')">'
     + _boardLabel + '</button>';
  if (c.slug) h += '<a class="dp-action-btn" href="property.html?slug=' + encodeURIComponent(c.slug) + '&ref=explore" style="text-decoration:none">Full profile</a>';
  h += '</div>';
  h += '</div>'; /* /section */

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     3. SCORE EXPLANATION
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">About this score</div>';
  h += '<div style="font-size:var(--text-xs);color:var(--text-2);line-height:1.65">FanScore reflects fan passion and engagement health across digital platforms. It does not indicate brand fit, sponsorship value, or ROI.</div>';
  h += '<button class="dp-expand-toggle" onclick="dpToggleExpand(this)">How FanScore is calculated <span>&#9660;</span></button>';
  h += '<div class="dp-expand-content">FanScore is derived from signals across social and digital platforms including post volume, audience interaction, reach consistency, and engagement quality. Signals are normalised, weighted by platform, and averaged over the selected time window. The model applies suppression when data integrity thresholds are not met.</div>';
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     4. ENGAGEMENT SNAPSHOT
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">Engagement snapshot</div>';
  var _audienceSize  = (c.followers != null && c.followers > 0) ? fmtFollowers(c.followers) : null;
  var _platformReach = (c.platforms && c.platforms.length) ? c.platforms.length + (c.platforms.length === 1 ? ' platform' : ' platforms') : null;
  var _engRate       = c.engRate30d != null ? c.engRate30d.toFixed(2) + '%' : null;
  var _interVol      = (c.interactions30d != null && c.interactions30d > 0) ? fmtFollowers(c.interactions30d) : null;
  var _consistency   = c.vol30 != null ? (c.vol30 < 5 ? 'High' : c.vol30 <= 12 ? 'Moderate' : 'Variable') : null;
  h += dpSignalGroup('Audience', [
    { label: 'Total audience size', val: _audienceSize },
    { label: 'Platform reach', val: _platformReach }
  ]);
  h += dpSignalGroup('Engagement', [
    { label: 'Engagement rate', val: _engRate },
    { label: 'Interaction volume', val: _interVol }
  ]);
  h += dpSignalGroup('Growth', [
    { label: '30-day trend', val: c.t30 != null ? (arr(c.t30) + '\u2009' + Math.abs(c.t30).toFixed(2) + '/day') : null, color: c.t30 != null ? arrC(c.t30) : null },
    { label: '90-day trend', val: c.t90 != null ? (arr(c.t90) + '\u2009' + Math.abs(c.t90).toFixed(2) + '/day') : null, color: c.t90 != null ? arrC(c.t90) : null }
  ]);
  h += dpSignalGroup('Loyalty & stability', [
    { label: 'Repeat engagement', val: null },
    { label: 'Audience consistency', val: _consistency }
  ]);
  if (sup) {
    h += '<div class="dp-integrity-notice">Unusual activity detected and adjusted in the FanScore calculation.</div>';
  } else if (c.cov30 != null && c.cov30 < 80) {
    h += '<div class="dp-integrity-notice">Data coverage for this window is ' + Math.round(c.cov30) + '%. Score reliability may be reduced.</div>';
  }
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     4b. MOMENTUM SIGNALS
  ─────────────────────────────────────────────────────────────── */
  var _signals = computeMomentumScore(c);
  if (_signals.length > 0) {
    h += '<div class="dp-section">';
    h += '<div class="dp-section-label">Momentum signals</div>';
    h += '<div style="display:flex;gap:var(--spacing-xs);flex-wrap:wrap;padding:var(--spacing-xs) 0;margin-bottom:var(--spacing-md)">'
      + _signals.map(function(b){ return '<span class="signal-badge">'+b+'</span>'; }).join('')
      + '</div>';
    h += dpSignalGroup('Context', [
      { label: '30-day trend score', val: c.t30 != null ? (arr(c.t30) + '\u2009' + Math.abs(c.t30).toFixed(2) + '/day') : null, color: c.t30 != null ? arrC(c.t30) : null },
      { label: 'Engagement rate',    val: c.engRate30d != null ? c.engRate30d.toFixed(2) + '%' : null }
    ]);
    h += '</div>';
    h += '<div class="dp-divider"></div>';
  }

  /* ───────────────────────────────────────────────────────────────
     5. PROPERTY DESCRIPTION
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">About this property</div>';
  h += '<div class="dp-full-bio">' + (c.bio ? escHtml(c.bio) : '<span style="color:var(--text-3);font-style:italic">No description available.</span>') + '</div>';
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     6. KEY FACTS
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">Key facts</div>';
  h += '<div class="dp-facts">';
  h += dpFact('Country',             c.country ? countryFlag(c.country) + '\u2009' + c.country : null);
  h += dpFact('Property type',       cfg.label || null);
  h += dpFact('Competition / league', null);
  h += dpFact('Sport category',       c.sport  || null);
  h += dpFact('Season timing',        null);
  h += dpFact('Primary region',       c.region || c.city || null);
  h += '</div>';
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     7. SCORE HISTORY
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">Score history</div>';
  if (!sup && !noData && c.sparks && c.sparks.length >= 2) {
    h += '<div class="dp-spark-chart">' + renderSpark(c.sparks, scoreColor, 280, 64) + '</div>';
  }
  if (noData) {
    h += '<div class="dp-conf" style="color:var(--text-3)">No social data available for this property</div>';
  } else {
    h += '<div class="dp-windows">';
    h += dpWindow(c.s30, '30d', scoreColor);
    h += dpWindow(c.s60, '60d', null);
    h += dpWindow(c.s90, '90d', null);
    h += '</div>';
  }
  if (!sup && !noData && c.t30 != null) {
    var note = c.t30 > 0.2 ? 'Fan engagement is tracking upward over the 30-day window.'
             : c.t30 < -0.2 ? 'Fan engagement is tracking downward over the 30-day window.'
             : 'Fan engagement is broadly stable over the 30-day window.';
    h += '<div class="dp-trend-note">' + note + '</div>';
  }
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     8. RELATED PROPERTIES (async — DB-backed)
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">Related properties</div>';
  h += '<div id="dp-rel-body"><span style="font-size:var(--text-xs);color:var(--text-3)">Loading\u2026</span></div>';
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     9. DATA & TRANSPARENCY
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section">';
  h += '<div class="dp-section-label">Data & transparency</div>';
  h += '<div class="dp-facts">';
  h += dpFact('Model version',       c.model  || null);
  h += dpFact('Data as of',          c.asOf   || null);
  h += dpFact('Confidence band',     c.conf30 || null);
  h += dpFact('Coverage (30d)',      c.cov30  != null ? Math.round(c.cov30) + '% of days' : null);
  var _platformStr = (c.platforms && c.platforms.length)
    ? c.platforms.map(function(p) { return PLATFORM_LABELS[p] || p; }).join(' \u00B7 ')
    : null;
  h += dpFact('Source platforms', _platformStr);
  h += '</div>';
  if (c.cov30 != null) {
    h += '<div class="dp-cov-bar" style="margin-top:var(--spacing-sm)"><div class="dp-cov-fill" style="width:' + Math.min(100, Math.round(c.cov30)) + '%"></div></div>';
  }
  h += '<button class="dp-report-link" onclick="dpAction(\'report\',\'' + c.id + '\')">Report a data issue</button>';
  h += '</div>';

  h += '<div class="dp-divider"></div>';

  /* ───────────────────────────────────────────────────────────────
     10. RECENT POSTS
  ─────────────────────────────────────────────────────────────── */
  h += '<div class="dp-section" id="dp-posts-section">';
  h += '<div class="dp-section-label">Recent posts</div>';
  h += '<div id="dp-posts-container"><span class="dp-posts-loading">Loading\u2026</span></div>';
  h += '</div>';

  /* ───────────────────────────────────────────────────────────────
     11. FULL PROFILE CTA — navigate to property.html
  ─────────────────────────────────────────────────────────────── */
  if (c.slug) {
    h += '<div class="dp-section dp-profile-cta">';
    h += '<a class="dp-profile-cta-link" href="property.html?slug=' + encodeURIComponent(c.slug) + '&ref=explore">Open full property profile &#x2192;</a>';
    h += '</div>';
  }

  document.getElementById('dp-content').innerHTML = h;

  /* Async fetches — guard against panel changing during load */
  var _loadingForId = c.id;

  /* Posts */
  loadPosts(c.id).then(function(posts) {
    if (detailCardId !== _loadingForId) return;
    renderPostsInPanel(posts);
  }).catch(function() {
    if (detailCardId !== _loadingForId) return;
    var el = document.getElementById('dp-posts-container');
    if (el) el.innerHTML = '<span class="dp-posts-empty">Post data unavailable.</span>';
  });

  /* Relationships */
  loadRelationships(c.id).then(function(rels) {
    if (detailCardId !== _loadingForId) return;
    renderRelationshipsInPanel(rels);
  }).catch(function() {
    if (detailCardId !== _loadingForId) return;
    var el = document.getElementById('dp-rel-body');
    if (el) el.innerHTML = '<div class="dp-empty">Relationship data unavailable.</div>';
  });
}

var REL_LABELS = {
  'athlete_belongs_to_team:forward':          'Drives for',
  'athlete_belongs_to_team:reverse':          'Drivers / Athletes',
  'athlete_competes_in_event:forward':        'Competing in',
  'athlete_competes_in_event:reverse':        'Participating athletes',
  'athlete_competes_in_series:forward':       'Competing in series',
  'athlete_competes_in_series:reverse':       'Athletes',
  'event_at_venue:forward':                   'Venue',
  'event_at_venue:reverse':                   'Events hosted',
  'governing_body_oversees_series:forward':   'Oversees series',
  'governing_body_oversees_series:reverse':   'Governed by',
  'occurrence_of_event_brand:forward':        'Parent event brand',
  'occurrence_of_event_brand:reverse':        'Occurrences',
  'series_contains_event:forward':            'Events',
  'series_contains_event:reverse':            'Part of series',
  'series_has_team:forward':                  'Participating teams',
  'series_has_team:reverse':                  'Competing in',
  'team_competes_in_series:forward':          'Competing in series',
  'team_competes_in_series:reverse':          'Competing teams',
  'team_has_athlete:forward':                 'Drivers / Athletes',
  'team_has_athlete:reverse':                 'Drives for'
};

/* Max items rendered per relationship group (prevents wall-of-text for high-cardinality types) */
var REL_MAX_PER_GROUP = 8;

function renderRelationshipsInPanel(rels) {
  var el = document.getElementById('dp-rel-body');
  if (!el) return;

  var groups = {};
  var groupOrder = [];
  var allRels = (rels.forward || []).concat(rels.reverse || []);

  allRels.forEach(function(r) {
    var key = r.type + ':' + r.dir;
    var label = REL_LABELS[key] || r.type;
    var card = allCards.filter(function(c) { return c.id === r.relatedId; })[0];
    if (!card) return;
    if (!groups[label]) { groups[label] = []; groupOrder.push(label); }
    /* Deduplicate within group */
    if (groups[label].some(function(g) { return g.id === card.id; })) return;
    groups[label].push(card);
  });

  if (!groupOrder.length) {
    el.innerHTML = '<div class="dp-empty">No linked properties.</div>';
    return;
  }

  var h = '';
  groupOrder.forEach(function(label) {
    var cards = groups[label];
    var shown = cards.slice(0, REL_MAX_PER_GROUP);
    h += '<div class="dp-rel-group">';
    h += '<div class="dp-rel-group-label">' + escHtml(label) + '</div>';
    shown.forEach(function(card) {
      var rCfg = TYPE[card.type] || { bgVar: 'var(--surface-muted)', fgVar: 'var(--text-2)', scoreVar: 'var(--text-1)' };
      h += '<div class="dp-rel-item" onclick="selectCard(\'' + card.id + '\')" tabindex="0" role="button"'
        + ' onkeydown="if(event.key===\'Enter\'||event.key===\' \')selectCard(\'' + card.id + '\')">';
      h += '<div class="dp-related-icon" style="background:' + rCfg.bgVar + ';color:' + rCfg.fgVar + '">'
        + (HERO_ICONS[card.type] || HERO_ICONS.series) + '</div>';
      h += '<div class="dp-related-info">';
      h += '<div class="dp-related-name">' + escHtml(card.name) + '</div>';
      h += '<div class="dp-related-reason">' + escHtml(TYPE[card.type] ? TYPE[card.type].label : card.type) + '</div>';
      h += '</div>';
      h += '<div class="dp-related-score" style="color:' + (rCfg.scoreVar || rCfg.fgVar) + '">'
        + fmtScore(card.s30) + '</div>';
      h += '</div>';
    });
    if (cards.length > REL_MAX_PER_GROUP) {
      h += '<div class="dp-empty" style="padding-top:var(--spacing-xs)">'
        + (cards.length - REL_MAX_PER_GROUP) + ' more not shown.</div>';
    }
    h += '</div>';
  });
  el.innerHTML = h;
}

function renderPostsInPanel(posts) {
  var el = document.getElementById('dp-posts-container');
  if (!el) return;
  if (!posts || !posts.length) {
    el.innerHTML = '<span class="dp-posts-empty">No recent posts found.</span>';
    return;
  }
  /* Identify top post by likes */
  var topIdx = -1; var topLikes = 0;
  posts.forEach(function(p, i) {
    var l = Number(p.total_likes) || 0;
    if (l > topLikes) { topLikes = l; topIdx = i; }
  });
  var h = '';
  posts.forEach(function(p, i) {
    var isTop     = (i === topIdx && topLikes > 0 && posts.length > 1);
    var dateStr   = p.posted_at ? p.posted_at.slice(0, 10) : '';
    var plat      = PLATFORM_LABELS[p.platform] || p.platform || '';
    var ctype     = p.content_type ? p.content_type.charAt(0).toUpperCase() + p.content_type.slice(1) : '';
    var likes     = Number(p.total_likes)    || 0;
    var comments  = Number(p.total_comments) || 0;
    var shares    = Number(p.total_shares)   || 0;
    var metrics   = [];
    if (likes    > 0) metrics.push(fmtFollowers(likes)    + ' likes');
    if (comments > 0) metrics.push(fmtFollowers(comments) + ' comments');
    if (shares   > 0) metrics.push(fmtFollowers(shares)   + ' shares');
    h += '<div class="dp-post-item">';
    h += '<div class="dp-post-header">';
    h += '<span class="dp-post-date">' + dateStr + '</span>';
    h += '<span class="dp-post-type">' + plat + (ctype ? ' \u00B7 ' + ctype : '') + '</span>';
    var badges = '';
    if (p.is_viral) badges += '<span class="dp-post-badge viral">Viral</span>';
    if (isTop)      badges += '<span class="dp-post-badge top">Top</span>';
    if (badges) h += '<span class="dp-post-badges">' + badges + '</span>';
    h += '</div>';
    if (p.caption) {
      var cap = p.caption.length > 110 ? p.caption.slice(0, 110).replace(/\s+\S+$/, '') + '\u2026' : p.caption;
      h += '<div class="dp-post-caption">' + escHtml(cap) + '</div>';
    }
    if (metrics.length) h += '<div class="dp-post-metrics">' + metrics.join(' \u00B7 ') + '</div>';
    h += '</div>';
  });
  el.innerHTML = h;
}

function dpWindow(val, label, color) {
  return '<div class="dp-window">'
    + '<div class="dp-window-val"' + (color ? ' style="color:' + color + '"' : '') + '>' + (val != null ? fmt(val, 1) : '--') + '</div>'
    + '<div class="dp-window-label">' + label + '</div>'
    + '</div>';
}

function dpSignalGroup(groupLabel, signals) {
  var h = '<div class="dp-signal-group">';
  h += '<div class="dp-signal-group-label">' + groupLabel + '</div>';
  signals.forEach(function(s) {
    h += '<div class="dp-signal-row">';
    h += '<span class="dp-signal-name">' + s.label + '</span>';
    h += s.val != null
      ? '<span class="dp-signal-val"' + (s.color ? ' style="color:' + s.color + '"' : '') + '>' + s.val + '</span>'
      : '<span class="dp-signal-val na">not available</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function dpFact(label, val) {
  return '<div class="dp-fact-row">'
    + '<span class="dp-fact-label">' + label + '</span>'
    + (val != null
       ? '<span class="dp-fact-val">' + val + '</span>'
       : '<span class="dp-fact-val na">Data not available</span>')
    + '</div>';
}

function dpRelated(c) {
  var results = [];
  var candidates = allCards.filter(function(r) { return r.id !== c.id && !r.sup30; });
  /* Same type — sort by proximity of score */
  var sameType = candidates.filter(function(r) { return r.type === c.type; })
    .sort(function(a, b) { return Math.abs((a.s30 || 0) - (c.s30 || 0)) - Math.abs((b.s30 || 0) - (c.s30 || 0)); })
    .slice(0, 2);
  sameType.forEach(function(r) {
    var reason = 'Same property type';
    if ((c.type === 'driver' || c.type === 'athlete') && r.teamNames && c.teamNames &&
        r.teamNames.some(function(t) { return c.teamNames.indexOf(t) !== -1; })) reason = 'Same team';
    results.push({ card: r, reason: reason });
  });
  /* Comparable score — different type */
  if (results.length < 3 && c.s30 != null) {
    var similar = candidates.filter(function(r) {
      return r.type !== c.type && r.s30 != null && Math.abs(r.s30 - c.s30) <= 6;
    }).sort(function(a, b) { return Math.abs(a.s30 - c.s30) - Math.abs(b.s30 - c.s30); }).slice(0, 1);
    similar.forEach(function(r) { results.push({ card: r, reason: 'Comparable engagement profile' }); });
  }
  return results.slice(0, 3);
}

function dpToggleExpand(btn) {
  var content = btn.nextElementSibling;
  content.classList.toggle('open');
  var arrow = btn.querySelector('span');
  if (arrow) arrow.innerHTML = content.classList.contains('open') ? '&#9650;' : '&#9660;';
}

/* ── Panel action helpers ─────────────────────────────────────────────── */

function _dpRefreshBtn(btnId, labelTrue, labelFalse, isActive) {
  var btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = isActive ? labelTrue : labelFalse;
  btn.classList.toggle('active', !!isActive);
}

function dpAction(action, id) {
  var card = allCards.filter(function(c) { return c.id === id; })[0];
  var slug = card ? card.slug : null;

  if (action === 'watch') {
    if (!slug) return;
    var nowIn = SAI_STORAGE.watchlist.toggle(slug);
    _dpRefreshBtn('dp-btn-watch', 'Watching', 'Watch', nowIn);
    /* Sync card overlay buttons on the grid without requiring a re-render */
    if (typeof syncWatchlistButtons === 'function') syncWatchlistButtons(slug, nowIn);

  } else if (action === 'portfolio') {
    if (!slug) return;
    var nowIn = SAI_STORAGE.portfolio.toggle(slug);
    _dpRefreshBtn('dp-btn-portfolio', 'In portfolio', 'Portfolio', nowIn);
    /* Sync card overlay buttons on the grid without requiring a re-render */
    if (typeof syncPortfolioButtons === 'function') syncPortfolioButtons(slug, nowIn);

  } else if (action === 'compare') {
    if (!slug) return;
    /* Delegate entirely to compareToggle when available (explore.html context).
       compareToggle handles both compareList and SAI_STORAGE to avoid double-toggle.
       Fall back to direct storage toggle on pages without compareToggle (e.g. future pages). */
    var nowIn;
    if (typeof compareToggle === 'function') {
      nowIn = compareToggle(id);
    } else {
      nowIn = SAI_STORAGE.compare.toggle(slug);
    }
    var _newCount = SAI_STORAGE.compare.get().length;
    var _cmpFull  = !nowIn && _newCount >= 4;
    var _newLabel = nowIn     ? 'Comparing'
                  : _cmpFull  ? 'Compare (full)'
                  : _newCount > 0 ? 'Compare (' + _newCount + '/4)' : 'Compare';
    _dpRefreshBtn('dp-btn-compare', _newLabel, _newLabel, nowIn);

  } else if (action === 'board') {
    if (!slug) return;
    var nowIn = SAI_STORAGE.board.isOnBoard(slug);
    if (nowIn) {
      /* Clicking again when already on board removes it */
      SAI_STORAGE.board.removeFromBoard(slug);
      _dpRefreshBtn('dp-btn-board', 'Add to Board', 'Add to Board', false);
    } else {
      SAI_STORAGE.board.addToStage(slug, 'watching');
      _dpRefreshBtn('dp-btn-board', 'Watching', 'Watching', true);
    }
    /* Sync card hero-btn board buttons (nowIn was state before toggle, so flip it) */
    if (typeof syncBoardButtons === 'function') syncBoardButtons(slug, !nowIn);

  } else if (action === 'report') {
    console.log('[SponsorAI] data issue report for property:', id);
  }
}

function selectCard(id) {
  /* Navigate directly to the property page.
     The slide-out panel is no longer used for card navigation — clicking a card
     goes straight to property.html. Hero action buttons are protected upstream
     via the .card-hero-actions guard in card.js (event.target.closest check). */
  var card = allCards.filter(function(c) { return c.id === id; })[0];
  if (card && card.slug) {
    window.location.href = 'property.html?slug=' + encodeURIComponent(card.slug);
  }
}
