/* ── UI / Grid layer ─────────────────────────────────────────────────────
   Depends on globals from data.js:         allCards, MODEL, activeFilter
   Depends on globals from components/card.js:    renderCard
   Depends on globals in inline script (runtime only, not parse time):
     chatState, addMsg()
   Must load after components/panel.js and before the inline script block.
────────────────────────────────────────────────────────────────────────── */

function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem('sai-theme', theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var tl = document.getElementById('theme-light');
  var td = document.getElementById('theme-dark');
  if (tl) tl.classList.toggle('active', theme === 'light');
  if (td) td.classList.toggle('active', theme === 'dark');
}

/* ── Nav menu (left bar) ─────────────────────────────────────────────── */
var navMenuOpen = false;

function toggleNavMenu() {
  navMenuOpen ? closeNavMenu() : openNavMenu();
}
function openNavMenu() {
  navMenuOpen = true;
  document.getElementById('nav-menu').classList.add('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'true');
  document.getElementById('menu-btn').classList.add('active');
  /* Also sync the Explore page brand-frame menu button (bar-left is hidden there) */
  var ehMenuBtn = document.getElementById('eh-menu-btn');
  if (ehMenuBtn) { ehMenuBtn.setAttribute('aria-expanded', 'true'); ehMenuBtn.classList.add('active'); }
}
function closeNavMenu() {
  navMenuOpen = false;
  document.getElementById('nav-menu').classList.remove('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('menu-btn').classList.remove('active');
  /* Also sync the Explore page brand-frame menu button */
  var ehMenuBtn = document.getElementById('eh-menu-btn');
  if (ehMenuBtn) { ehMenuBtn.setAttribute('aria-expanded', 'false'); ehMenuBtn.classList.remove('active'); }
}

/* ── Profile menu ────────────────────────────────────────────────────── */
var profileMenuOpen = false;

function toggleProfileMenu() {
  profileMenuOpen ? closeProfileMenu() : openProfileMenu();
}
function openProfileMenu() {
  profileMenuOpen = true;
  document.getElementById('profile-menu').classList.add('open');
  document.getElementById('profile-btn').setAttribute('aria-expanded', 'true');
}
function closeProfileMenu() {
  profileMenuOpen = false;
  document.getElementById('profile-menu').classList.remove('open');
  document.getElementById('profile-btn').setAttribute('aria-expanded', 'false');
}

/* ── Sort menu ────────────────────────────────────────────────────────── */
var sortMenuOpen = false;

function toggleSortMenu() {
  sortMenuOpen ? closeSortMenu() : openSortMenu();
}
function openSortMenu() {
  sortMenuOpen = true;
  var menu = document.getElementById('sort-menu');
  var t    = document.getElementById('sort-trigger');
  if (menu) menu.classList.add('open');
  if (t)  { t.setAttribute('aria-expanded', 'true'); t.classList.add('open'); }
  /* Sync Sort buttons in explore header + sticky bar */
  document.querySelectorAll('.eh-filter-sort').forEach(function(b){ b.classList.add('open'); });
}
function closeSortMenu() {
  sortMenuOpen = false;
  var menu = document.getElementById('sort-menu');
  var t    = document.getElementById('sort-trigger');
  if (menu) menu.classList.remove('open');
  if (t)  { t.setAttribute('aria-expanded', 'false'); t.classList.remove('open'); }
  /* Sync Sort buttons in explore header + sticky bar */
  document.querySelectorAll('.eh-filter-sort').forEach(function(b){ b.classList.remove('open'); });
}
function applySort(key) {
  _metaSort = key;
  closeSortMenu();
  renderGrid(activeFilter);
}

/* ── Chat panel ──────────────────────────────────────────────────────── */
var chatOpen = false;

function toggleChat() {
  chatOpen ? closeChat() : openChat();
}
function updateChatToggle(isOpen) {
  var on  = document.getElementById('chat-toggle-on');
  var off = document.getElementById('chat-toggle-off');
  if (on)  on.classList.toggle('active', isOpen);
  if (off) off.classList.toggle('active', !isOpen);
}
function openChat() {
  chatOpen = true;
  document.body.classList.add('chat-open');
  document.getElementById('chat-panel').classList.add('open');
  updateChatToggle(true);
  setTimeout(function() { document.getElementById('cp-input').focus(); }, 300);
  /* Fire greeting on first open */
  if (!chatState.greeted) {
    chatState.greeted = true;
    setTimeout(function() {
      addMsg("Hi! I'm here to help you find the right sponsorship properties. What brings you here today — are you looking for new opportunities, reviewing a portfolio, or researching the market?", 'ai');
    }, 450);
  }
}
function closeChat() {
  chatOpen = false;
  document.body.classList.remove('chat-open');
  document.getElementById('chat-panel').classList.remove('open');
  updateChatToggle(false);
}

/* ── Nav active state ────────────────────────────────────────────────── */
function setNavActive(name) {
  document.querySelectorAll('.menu-item').forEach(function(el) {
    var isActive = el.dataset.nav === name;
    el.classList.toggle('active', isActive);
    if (isActive) el.setAttribute('aria-current', 'page');
    else          el.removeAttribute('aria-current');
  });
  var titleEl = document.getElementById('page-view-title');
  if (titleEl) titleEl.textContent = name;
}

/* ── Filter & render ──────────────────────────────────────────────────── */
var _metaSort = 'alpha-asc'; /* current sort key — never defaults to score */

function sortLabel(sort) {
  var labels = {
    'alpha-asc':       'Sorted A\u2013Z',
    'alpha-desc':      'Sorted Z\u2013A',
    'score-desc':      'FanScore high to low',
    'score-asc':       'FanScore low to high',
    'followers-desc':  'Followers high to low',
    'engagement-desc': 'Engagement rate high to low',
    'trend-up':        'Trend up first',
    'trend-down':      'Trend down first',
    'trending':        'Trending first'
  };
  return labels[sort] || 'Sorted A\u2013Z';
}

function sortCards(cards) {
  var s = cards.slice();
  switch (_metaSort) {
    case 'alpha-desc':
      s.sort(function(a,b){ return b.name.localeCompare(a.name); }); break;
    case 'score-desc':
      s.sort(function(a,b){ return (b.s30!=null?b.s30:-999)-(a.s30!=null?a.s30:-999); }); break;
    case 'score-asc':
      s.sort(function(a,b){ return (a.s30!=null?a.s30:999)-(b.s30!=null?b.s30:999); }); break;
    case 'followers-desc':
      s.sort(function(a,b){ return (b.followers!=null?b.followers:-1)-(a.followers!=null?a.followers:-1); }); break;
    case 'engagement-desc':
      s.sort(function(a,b){ return (b.engRate30d!=null?b.engRate30d:-1)-(a.engRate30d!=null?a.engRate30d:-1); }); break;
    case 'trend-up':
      s.sort(function(a,b){ return (b.t30!=null?b.t30:-999)-(a.t30!=null?a.t30:-999); }); break;
    case 'trend-down':
      s.sort(function(a,b){ return (a.t30!=null?a.t30:999)-(b.t30!=null?b.t30:999); }); break;
    case 'trending':
      s.sort(function(a,b){
        var sa = computeMomentumScore(a).length;
        var sb = computeMomentumScore(b).length;
        if (sb !== sa) return sb - sa;
        return (b.t30!=null?b.t30:-999)-(a.t30!=null?a.t30:-999);
      }); break;
    default: /* alpha-asc */
      s.sort(function(a,b){ return a.name.localeCompare(b.name); }); break;
  }
  return s;
}

function updateMeta(shown, total) {
  var asOf      = allCards[0] && allCards[0].asOf ? allCards[0].asOf : '--';
  var filtered  = shown !== total;
  var countText = filtered
    ? 'Showing ' + shown + ' of ' + total + ' properties'
    : total + ' properties';

  /* Count text — no sort label appended; sort label lives in the trigger button */
  var el = document.getElementById('page-meta');
  if (el) el.textContent = countText;

  /* Explore header — count label (filter row, right edge) */
  var shortCount = shown + (filtered ? ' of ' + total : '') + ' properties';
  var ehCount = document.getElementById('eh-count');
  if (ehCount) ehCount.textContent = shortCount;

  /* Explore header — subtitle becomes count line when in result state */
  var intro = document.querySelector('.eh-intro');
  if (intro && intro.classList.contains('is-result')) {
    var subEl = document.querySelector('.eh-subtitle');
    if (subEl) subEl.textContent = shortCount;
  }

  /* Explore header — sort button labels (header + sticky) */
  var ehSortLabel     = document.getElementById('eh-sort-label');
  var stickySort      = document.getElementById('sticky-sort-label');
  var currentSortText = 'Sort: ' + sortLabel(_metaSort);
  if (ehSortLabel)  ehSortLabel.textContent  = currentSortText;
  if (stickySort)   stickySort.textContent   = currentSortText;

  /* Update sort trigger label (bottom bar) */
  var triggerLabel = document.getElementById('sort-trigger-label');
  if (triggerLabel) triggerLabel.textContent = sortLabel(_metaSort);

  /* Mark the active item in the sort menu */
  document.querySelectorAll('.sort-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.sort === _metaSort);
  });

  /* Keep nav menu model label in sync */
  var navLabel = document.getElementById('nav-model-label');
  if (navLabel) navLabel.textContent = 'model ' + MODEL + ' \u00B7 as of ' + asOf;
}

/* Animate existing cards out, then swap grid content */
function setGridContent(html) {
  var grid = document.getElementById('card-grid');
  var existing = grid.querySelectorAll('.fanscore-card');
  if (!existing.length) {
    grid.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    grid.classList.remove('anim-in'); grid.offsetHeight; grid.classList.add('anim-in');
    return;
  }
  var stagger = 18; /* ms between each card */
  var baseDuration = 220; /* matches card-out animation */
  var maxTotal = 380; /* cap so large grids don't drag */
  existing.forEach(function(el, i) {
    el.style.animationDelay = (i * stagger) + 'ms';
    el.classList.add('card-leaving');
  });
  var total = Math.min(baseDuration + (existing.length * stagger), maxTotal);
  setTimeout(function() {
    grid.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    grid.classList.remove('anim-in'); grid.offsetHeight; grid.classList.add('anim-in');
  }, total);
}

/* Map each filter pill to the property_type values it should match.
   'driver' covers both legacy driver rows and the current athlete type. */
var FILTER_TYPES = {
  driver: ['driver', 'athlete'],
  team:   ['team'],
  series: ['series'],
  event:  ['event'],
  venue:  ['venue']
};

/* ── Audience filter ──────────────────────────────────────────────── */
var _audFilter   = null;   /* null = all; 'small'|'mid'|'large' */
var _audMenuOpen = false;

/* Bucket thresholds: small < 100k, mid 100k–1M, large >= 1M */
var _AUD_BTN_LABELS = {
  'small': 'Under 100k',
  'mid':   '100k\u20131M',
  'large': '1M+'
};

function openAudMenu() {
  var menu = document.getElementById('aud-menu');
  var btn  = document.getElementById('aud-btn');
  if (!menu || !btn) return;
  _audMenuOpen = true;
  menu.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}

function closeAudMenu() {
  var menu = document.getElementById('aud-menu');
  var btn  = document.getElementById('aud-btn');
  if (!menu) return;
  _audMenuOpen = false;
  menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleAudMenu() {
  if (_audMenuOpen) { closeAudMenu(); } else { openAudMenu(); }
}

function applyAud(aud) {
  /* aud: null = clear, otherwise 'small'|'mid'|'large' */
  _audFilter      = aud || null;
  _displayedCount = PAGE_SIZE;
  closeAudMenu();

  /* Update button label and active state */
  var btn = document.getElementById('aud-btn');
  if (btn) {
    var labelSpan = btn.querySelector('.aud-btn-label');
    if (labelSpan) {
      labelSpan.textContent = _audFilter ? (_AUD_BTN_LABELS[_audFilter] || _audFilter) : 'Audience';
    }
    if (_audFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  updateExploreContext();
  renderGrid(activeFilter);
}

/* ── Confidence filter ────────────────────────────────────────────── */
var _confFilter   = null;   /* null = all; 'high'|'medium'|'low'|'none' */
var _confMenuOpen = false;

/* Display labels for confidence filter keys */
var _CONF_LABELS = {
  'high':   'High confidence',
  'medium': 'Medium confidence',
  'low':    'Low confidence',
  'none':   'No score'
};

/* Button label uses shorter form when active */
var _CONF_BTN_LABELS = {
  'high':   'High',
  'medium': 'Medium',
  'low':    'Low',
  'none':   'No score'
};

function openConfMenu() {
  var menu = document.getElementById('conf-menu');
  var btn  = document.getElementById('conf-btn');
  if (!menu || !btn) return;
  _confMenuOpen = true;
  menu.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}

function closeConfMenu() {
  var menu = document.getElementById('conf-menu');
  var btn  = document.getElementById('conf-btn');
  if (!menu) return;
  _confMenuOpen = false;
  menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleConfMenu() {
  if (_confMenuOpen) { closeConfMenu(); } else { openConfMenu(); }
}

function applyConf(conf) {
  /* conf: null = clear, otherwise 'high'|'medium'|'low'|'none' */
  _confFilter     = conf || null;
  _displayedCount = PAGE_SIZE;
  closeConfMenu();

  /* Update button label and active state */
  var btn = document.getElementById('conf-btn');
  if (btn) {
    var labelSpan = btn.querySelector('.conf-btn-label');
    if (labelSpan) {
      labelSpan.textContent = _confFilter ? (_CONF_BTN_LABELS[_confFilter] || _confFilter) : 'Confidence';
    }
    if (_confFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  updateExploreContext();
  renderGrid(activeFilter);
}

/* ── Geography filter ─────────────────────────────────────────────── */
var _geoFilter   = null;   /* null = all geographies; otherwise 'uk'|'europe'|'asia' */
var _geoMenuOpen = false;

/* Display labels for geo bucket keys */
var _GEO_LABELS = {
  'uk':     'United Kingdom',
  'europe': 'Continental Europe',
  'asia':   'Asia'
};

/* Derive a stable geo bucket from a card's raw country + region values.
   Both fields are inconsistent in the dataset (mix of ISO codes and full names)
   so we normalise here rather than relying on raw equality. */
function _getGeoBucket(c) {
  var co = (c.country || '').trim();
  var re = (c.region  || '').trim();

  /* UK: ISO code GB or full-name variant */
  if (co === 'GB' || co === 'United Kingdom') return 'uk';
  if (re === 'United Kingdom') return 'uk';

  /* Asia: ISO codes for current dataset */
  if (co === 'HK' || co === 'CN' || co === 'JP' || co === 'KR') return 'asia';
  if (re === 'Asia') return 'asia';

  /* Continental Europe: ISO codes */
  var euISO = { IT:1, FR:1, BE:1, DE:1, ES:1, CH:1, IE:1, RU:1, AT:1, NL:1, PT:1, SE:1, NO:1, DK:1, PL:1 };
  if (euISO[co]) return 'europe';

  /* Continental Europe: full country names */
  var euNames = ['Italy','France','Germany','Belgium','Spain','Switzerland','Russia','Ireland',
                 'Netherlands','Austria','Portugal','Sweden','Norway','Denmark','Poland'];
  if (euNames.indexOf(co) >= 0) return 'europe';

  /* Fallback: region label signals */
  if (re === 'Europe') return 'europe';

  return null;
}

function openGeoMenu() {
  var menu = document.getElementById('geo-menu');
  var btn  = document.getElementById('geo-btn');
  if (!menu || !btn) return;
  _geoMenuOpen = true;
  menu.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}

function closeGeoMenu() {
  var menu = document.getElementById('geo-menu');
  var btn  = document.getElementById('geo-btn');
  if (!menu) return;
  _geoMenuOpen = false;
  menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleGeoMenu() {
  if (_geoMenuOpen) { closeGeoMenu(); } else { openGeoMenu(); }
}

function applyGeo(geo) {
  /* geo: null = clear, otherwise 'uk' | 'europe' | 'asia' */
  _geoFilter      = geo || null;
  _displayedCount = PAGE_SIZE;
  closeGeoMenu();

  /* Update button label and active state */
  var btn = document.getElementById('geo-btn');
  if (btn) {
    var labelSpan = btn.querySelector('.geo-btn-label');
    if (labelSpan) {
      labelSpan.textContent = _geoFilter ? (_GEO_LABELS[_geoFilter] || _geoFilter) : 'Geography';
    }
    if (_geoFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  updateExploreContext();
  renderGrid(activeFilter);
}

/* ── Sport filter ─────────────────────────────────────────────────── */
var _sportFilter    = null;  /* null = all sports; otherwise e.g. 'motorsport' */
var _sportMenuOpen  = false;

/* Capitalise first letter of each word */
function _toTitleCase(str) {
  return str.replace(/\w\S*/g, function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
}

function openSportMenu() {
  var menu = document.getElementById('sport-menu');
  var btn  = document.getElementById('sport-btn');
  if (!menu || !btn) return;
  _sportMenuOpen = true;
  menu.classList.add('open');
  btn.setAttribute('aria-expanded', 'true');
}

function closeSportMenu() {
  var menu = document.getElementById('sport-menu');
  var btn  = document.getElementById('sport-btn');
  if (!menu) return;
  _sportMenuOpen = false;
  menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleSportMenu() {
  if (_sportMenuOpen) { closeSportMenu(); } else { openSportMenu(); }
}

function applySport(sport) {
  /* sport: null = clear, otherwise the raw sport string e.g. 'motorsport' */
  _sportFilter    = sport || null;
  _displayedCount = PAGE_SIZE;
  closeSportMenu();

  /* Update button label and active state */
  var btn = document.getElementById('sport-btn');
  if (btn) {
    var labelSpan = btn.querySelector('.sport-btn-label');
    if (labelSpan) {
      labelSpan.textContent = _sportFilter ? _toTitleCase(_sportFilter) : 'Sport';
    }
    if (_sportFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  updateExploreContext();
  renderGrid(activeFilter);
}

/* ── Search ───────────────────────────────────────────────────────── */
var _searchTerm     = '';
var _searchDebounce = null;

/* Fields matched (case-insensitive, partial): name, slug, type label,
   sport, region, city. */
function matchesSearch(c, term) {
  var cfg = TYPE[c.type] || {};
  var fields = [
    c.name,
    c.slug,
    cfg.label || c.type,
    c.sport,
    c.region,
    c.city
  ];
  return fields.some(function(f) {
    return f && f.toLowerCase().indexOf(term) >= 0;
  });
}

function applySearch(term) {
  _searchTerm = (term || '').trim().toLowerCase();
  _displayedCount = PAGE_SIZE;
  /* Context first — sets is-result class and clears subtitle placeholder.
     renderGrid → updateMeta then writes the live count into the subtitle. */
  updateExploreContext();
  renderGrid(activeFilter);
}

function clearSearch() {
  var input  = document.getElementById('search-input');
  var sticky = document.getElementById('sticky-search-input');
  if (input) input.value = '';
  if (sticky) sticky.value = '';
  var btn  = document.getElementById('search-clear');
  var sBtn = document.getElementById('sticky-search-clear');
  if (btn)  btn.style.display  = 'none';
  if (sBtn) sBtn.style.display = 'none';
  applySearch('');
}

/* Resets the full Explore state: clears search, returns filter to All,
   restores default sort, scrolls back to top. */
function resetExplore() {
  /* Close sort menu if open */
  if (sortMenuOpen) closeSortMenu();

  /* Clear search inputs and hide clear buttons */
  var input  = document.getElementById('search-input');
  var sticky = document.getElementById('sticky-search-input');
  if (input)  input.value  = '';
  if (sticky) sticky.value = '';
  var btn  = document.getElementById('search-clear');
  var sBtn = document.getElementById('sticky-search-clear');
  if (btn)  btn.style.display  = 'none';
  if (sBtn) sBtn.style.display = 'none';

  /* Reset internal state */
  _searchTerm     = '';
  _sportFilter    = null;
  _geoFilter      = null;
  _confFilter     = null;
  _audFilter      = null;
  activeFilter    = 'all';
  _metaSort       = 'alpha-asc';
  _displayedCount = PAGE_SIZE;

  /* Reset sport button */
  var sportBtn = document.getElementById('sport-btn');
  if (sportBtn) {
    sportBtn.classList.remove('active');
    var sportLabel = sportBtn.querySelector('.sport-btn-label');
    if (sportLabel) sportLabel.textContent = 'Sport';
  }
  if (_sportMenuOpen) closeSportMenu();

  /* Reset geo button */
  var geoBtn = document.getElementById('geo-btn');
  if (geoBtn) {
    geoBtn.classList.remove('active');
    var geoLabel = geoBtn.querySelector('.geo-btn-label');
    if (geoLabel) geoLabel.textContent = 'Geography';
  }
  if (_geoMenuOpen) closeGeoMenu();

  /* Reset confidence button */
  var confBtn = document.getElementById('conf-btn');
  if (confBtn) {
    confBtn.classList.remove('active');
    var confLabel = confBtn.querySelector('.conf-btn-label');
    if (confLabel) confLabel.textContent = 'Confidence';
  }
  if (_confMenuOpen) closeConfMenu();

  /* Reset audience button */
  var audBtn = document.getElementById('aud-btn');
  if (audBtn) {
    audBtn.classList.remove('active');
    var audLabel = audBtn.querySelector('.aud-btn-label');
    if (audLabel) audLabel.textContent = 'Audience';
  }
  if (_audMenuOpen) closeAudMenu();

  /* Sync type tabs in both editorial header and sticky bar */
  document.querySelectorAll('.chip[data-filter]').forEach(function(c){ c.classList.remove('active'); });
  document.querySelectorAll('.chip[data-filter="all"]').forEach(function(c){ c.classList.add('active'); });

  /* Context first, then render (updateMeta inside renderGrid syncs labels + counts) */
  updateExploreContext();
  renderGrid('all');

  /* Return to top smoothly */
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Pagination ──────────────────────────────────────────────────────── */
var PAGE_SIZE      = 24;
var _displayedCount = PAGE_SIZE;
var _currentVis    = []; /* filtered + sorted set, full, updated on each renderGrid call */

function renderGrid(filter) {
  var vis;
  if (filter === 'all') {
    vis = allCards;
  } else {
    var matchTypes = FILTER_TYPES[filter] || [filter];
    vis = allCards.filter(function(c){ return matchTypes.indexOf(c.type) >= 0; });
  }
  /* Apply sport filter on top of type filter */
  if (_sportFilter) {
    vis = vis.filter(function(c) { return c.sport === _sportFilter; });
  }
  /* Apply geography filter on top of sport filter */
  if (_geoFilter) {
    vis = vis.filter(function(c) { return _getGeoBucket(c) === _geoFilter; });
  }
  /* Apply confidence filter on top of geo filter */
  if (_confFilter) {
    vis = vis.filter(function(c) {
      if (_confFilter === 'none') return !c.conf30;
      return c.conf30 && c.conf30.toLowerCase() === _confFilter;
    });
  }
  /* Apply audience filter on top of confidence filter */
  if (_audFilter) {
    vis = vis.filter(function(c) {
      var f = c.followers;
      if (f == null) return false;
      if (_audFilter === 'small')  return f < 100000;
      if (_audFilter === 'mid')    return f >= 100000 && f < 1000000;
      if (_audFilter === 'large')  return f >= 1000000;
      return false;
    });
  }
  /* Apply search on top of sport + geo + confidence + audience filters */
  if (_searchTerm) {
    vis = vis.filter(function(c) { return matchesSearch(c, _searchTerm); });
  }
  if (!vis.length) {
    var emptyMsg = _searchTerm
      ? 'No properties matched \u201C' + escHtml(_searchTerm) + '\u201D.'
      : 'No properties found.';
    setGridContent('<div class="state-msg">' + emptyMsg + '</div>');
    updateFooter(0, 0);
    return;
  }
  vis = sortCards(vis);
  _currentVis     = vis;
  _displayedCount = PAGE_SIZE; /* reset to first page on every new filter/sort/search */
  var page = vis.slice(0, _displayedCount);
  setGridContent(page.map(renderCard).join(''));
  updateMeta(vis.length, allCards.length);
  updateFooter(page.length, vis.length);
}

function loadMore() {
  _displayedCount += PAGE_SIZE;
  var page = _currentVis.slice(0, _displayedCount);
  /* Append new cards rather than replacing the whole grid */
  var grid = document.getElementById('card-grid');
  var frag = document.createElement('div');
  frag.innerHTML = _currentVis.slice(_displayedCount - PAGE_SIZE, _displayedCount).map(renderCard).join('');
  /* Animate new cards in */
  Array.prototype.forEach.call(frag.querySelectorAll('.fanscore-card'), function(el, i) {
    el.style.animationDelay = (i * 0.022) + 's';
  });
  while (frag.firstChild) grid.appendChild(frag.firstChild);
  if (window.lucide) lucide.createIcons();
  updateFooter(page.length, _currentVis.length);
}

function updateFooter(shown, total) {
  var footer = document.getElementById('explore-footer');
  if (!footer) return;
  if (!total) { footer.innerHTML = ''; footer.style.display = 'none'; return; }
  footer.style.display = '';
  var hasMore = shown < total;
  var html = '<span class="ef-count">' + shown + ' of ' + total + ' properties</span>';
  if (hasMore) {
    html += '<button class="ef-load-more" onclick="loadMore()">Load More Properties</button>';
  }
  footer.innerHTML = html;
}

function setFilter(el) {
  var filterVal = el.dataset.filter;
  /* Clear all chip-style filter tabs (main header + sticky bar share .chip class) */
  document.querySelectorAll('.chip[data-filter]').forEach(function(c){c.classList.remove('active');});
  /* Activate matching tabs in both rows simultaneously */
  document.querySelectorAll('.chip[data-filter="' + filterVal + '"]').forEach(function(c){c.classList.add('active');});
  activeFilter = filterVal;
  window.scrollTo({ top: 0 });
  /* Context first (is-result class, clear subtitle), then render fills subtitle with count */
  updateExploreContext();
  renderGrid(activeFilter);
}

/* ── Contextual header ────────────────────────────────────────────────── */
/* Updates the explore intro block to reflect the active search / filter context.
   - Default state: generic discovery title + subtitle
   - Result state: active term or filter label + property count           */
var _EH_DEFAULT_TITLE    = 'Explore the Sponsorship Market';
var _EH_DEFAULT_SUBTITLE = 'Find teams, athletes, events and series across sport.';

/* Human-readable labels for filter keys */
var _FILTER_LABELS = {
  'all':    null,       /* no result context when "all" is selected */
  'driver': 'Athletes',
  'team':   'Teams',
  'event':  'Events',
  'venue':  'Venues',
  'series': 'Series'
};

/* Max chars before we fall back to generic "Search results" heading */
var _EH_MAX_TITLE_QUERY = 28;

function updateExploreContext() {
  var intro   = document.querySelector('.eh-intro');
  var titleEl = document.querySelector('.eh-title');
  var subEl   = document.querySelector('.eh-subtitle');
  if (!intro || !titleEl || !subEl) return;

  var hasSearch = _searchTerm && _searchTerm.length > 0;
  var hasFilter = activeFilter && activeFilter !== 'all';
  var hasSport  = !!_sportFilter;
  var hasGeo    = !!_geoFilter;
  var hasConf   = !!_confFilter;
  var hasAud    = !!_audFilter;
  var isActive  = hasSearch || hasFilter || hasSport || hasGeo || hasConf || hasAud;

  /* Sync sticky Clear button visibility */
  var stickyReset = document.getElementById('eh-sticky-reset');
  if (stickyReset) stickyReset.style.display = isActive ? '' : 'none';

  /* Body class — drives CSS hooks (filter count prominence, etc.) */
  document.body.classList.toggle('has-active-filter', isActive);

  if (hasSearch) {
    /* Prefer the raw input value (preserves original casing) */
    var displayQuery = (document.getElementById('search-input') || {}).value || _searchTerm;
    displayQuery = displayQuery.trim();
    if (displayQuery.length > _EH_MAX_TITLE_QUERY) {
      /* Long query — generic title; query visible in the search bar itself */
      titleEl.textContent = 'Search results';
    } else {
      titleEl.textContent = displayQuery || _EH_DEFAULT_TITLE;
    }
    /* Subtitle will be overwritten with count by updateMeta */
    subEl.textContent = '';
    intro.classList.add('is-result');
  } else if (hasFilter || hasSport || hasGeo) {
    /* One or more dimension filters active — build a calm, ordered title.
       Order: Sport · Geography · Type  (broadest → narrowest) */
    var parts = [];
    if (hasSport)  parts.push(_toTitleCase(_sportFilter));
    if (hasGeo)    parts.push(_GEO_LABELS[_geoFilter] || _geoFilter);
    if (hasFilter) parts.push(_FILTER_LABELS[activeFilter] || activeFilter);
    titleEl.textContent = parts.join(' \u00B7 ');
    /* Subtitle will be overwritten with count by updateMeta */
    subEl.textContent = '';
    intro.classList.add('is-result');
  } else {
    /* Default state — restore editorial copy */
    titleEl.textContent = _EH_DEFAULT_TITLE;
    subEl.textContent   = _EH_DEFAULT_SUBTITLE;
    intro.classList.remove('is-result');
  }
}
