/* ── UI / Grid layer ─────────────────────────────────────────────────────
   Depends on globals from data.js:         allCards, MODEL, activeFilter
   Depends on globals from components/card.js:    renderCard
   Depends on globals from components/layout.js:  activeLayout, layoutMasonry
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
}
function closeNavMenu() {
  navMenuOpen = false;
  document.getElementById('nav-menu').classList.remove('open');
  document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  document.getElementById('menu-btn').classList.remove('active');
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
}
function closeSortMenu() {
  sortMenuOpen = false;
  var menu = document.getElementById('sort-menu');
  var t    = document.getElementById('sort-trigger');
  if (menu) menu.classList.remove('open');
  if (t)  { t.setAttribute('aria-expanded', 'false'); t.classList.remove('open'); }
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
  _masonryReflow();
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
  _masonryReflow();
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
/* Cached parts so ghost can be repopulated after layoutMasonry() runs */
var _metaNumber     = '';   /* e.g. "120" or "50 of 120" */
var _metaFiltered   = false;
var _metaDetail     = '';        /* "sorted A-Z · model v1.0 · as of 2026-02-28" */
var _metaSort       = 'alpha-asc'; /* current sort key — never defaults to score */

function sortLabel(sort) {
  var labels = {
    'alpha-asc':       'Sorted A\u2013Z',
    'alpha-desc':      'Sorted Z\u2013A',
    'score-desc':      'FanScore high to low',
    'score-asc':       'FanScore low to high',
    'followers-desc':  'Followers high to low',
    'engagement-desc': 'Engagement rate high to low',
    'trend-up':        'Trend up first',
    'trend-down':      'Trend down first'
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
    default: /* alpha-asc */
      s.sort(function(a,b){ return a.name.localeCompare(b.name); }); break;
  }
  return s;
}

function updateGhostMeta() {
  var wrap = document.getElementById('ghost-meta-wrap');
  if (!wrap) return;
  var html = '';
  if (_metaFiltered) {
    html += '<span class="ghost-meta-label">Showing</span>';
    html += '<span class="ghost-meta-count">' + _metaNumber + '</span>';
  } else {
    html += '<span class="ghost-meta-count">' + _metaNumber + '</span>';
  }
  html += '<span class="ghost-meta-label ghost-meta-properties">Properties</span>';
  html += '<span class="ghost-meta-detail">' + _metaDetail + '</span>';
  wrap.innerHTML = html;
}

function updateMeta(shown, total) {
  var asOf        = allCards[0] && allCards[0].asOf ? allCards[0].asOf : '--';
  _metaFiltered   = shown !== total;
  _metaNumber     = _metaFiltered ? shown + ' of ' + total : String(total);
  _metaDetail     = sortLabel(_metaSort) + ' \u00B7 model ' + MODEL + ' \u00B7 as of ' + asOf;

  var countText   = _metaFiltered
    ? 'Showing ' + shown + ' of ' + total + ' properties'
    : total + ' properties';

  /* Count text — no sort label appended; sort label lives in the trigger button */
  var el = document.getElementById('page-meta');
  if (el) el.textContent = countText;

  /* Update sort trigger label */
  var triggerLabel = document.getElementById('sort-trigger-label');
  if (triggerLabel) triggerLabel.textContent = sortLabel(_metaSort);

  /* Mark the active item in the sort menu */
  document.querySelectorAll('.sort-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.sort === _metaSort);
  });

  /* Keep nav menu model label in sync */
  var navLabel = document.getElementById('nav-model-label');
  if (navLabel) navLabel.textContent = 'model ' + MODEL + ' \u00B7 as of ' + asOf;

  updateGhostMeta();
}

/* Animate existing cards out, then swap grid content */
function setGridContent(html) {
  var grid = document.getElementById('card-grid');
  var existing = grid.querySelectorAll('.fanscore-card');
  if (!existing.length) {
    if (activeLayout === 'masonry') grid.style.visibility = 'hidden'; /* bulletproof hide — opacity can still compositor-flash */
    grid.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    if (activeLayout === 'masonry') {
      setTimeout(function() {
        layoutMasonry();
        grid.style.visibility = '';
        grid.classList.remove('anim-in'); void grid.offsetHeight; grid.classList.add('anim-in');
        setTimeout(layoutMasonry, 400);
      }, 50);
    } else {
      grid.classList.remove('anim-in'); grid.offsetHeight; grid.classList.add('anim-in');
    }
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
    if (activeLayout === 'masonry') grid.style.visibility = 'hidden';
    grid.innerHTML = html;
    if (window.lucide) lucide.createIcons();
    if (activeLayout === 'masonry') {
      setTimeout(function() {
        layoutMasonry();
        grid.style.visibility = '';
        grid.classList.remove('anim-in'); void grid.offsetHeight; grid.classList.add('anim-in');
        setTimeout(layoutMasonry, 400);
      }, 50);
    } else {
      grid.classList.remove('anim-in'); grid.offsetHeight; grid.classList.add('anim-in');
    }
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

function renderGrid(filter) {
  var vis;
  if (filter === 'all') {
    vis = allCards;
  } else {
    var matchTypes = FILTER_TYPES[filter] || [filter];
    vis = allCards.filter(function(c){ return matchTypes.indexOf(c.type) >= 0; });
  }
  if (!vis.length){setGridContent('<div class="state-msg">No properties found.</div>');return;}
  vis = sortCards(vis);
  setGridContent(vis.map(renderCard).join(''));
  updateMeta(vis.length, allCards.length);
}

function setFilter(el) {
  document.querySelectorAll('.chip[data-filter]').forEach(function(c){c.classList.remove('active');});
  el.classList.add('active');
  activeFilter=el.dataset.filter;
  window.scrollTo({ top: 0 });
  renderGrid(activeFilter);
}

/* ── Masonry transition reflow helper ────────────────────────────────── */
/* Spreads layoutMasonry calls evenly across the panel slide duration (220ms)
   so absolute positions track the smooth padding-right/left transition. */
function _masonryReflow() {
  if (activeLayout !== 'masonry') return;
  [0, 55, 110, 165, 230].forEach(function(t) { setTimeout(layoutMasonry, t); });
}
