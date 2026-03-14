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
  if (!vis.length) {
    setGridContent('<div class="state-msg">No properties found.</div>');
    updateFooter(0, 0);
    return;
  }
  vis = sortCards(vis);
  _currentVis     = vis;
  _displayedCount = PAGE_SIZE; /* reset to first page on every new filter/sort */
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
    html += '<button class="ef-load-more" onclick="loadMore()">Load more</button>';
  }
  footer.innerHTML = html;
}

function setFilter(el) {
  document.querySelectorAll('.chip[data-filter]').forEach(function(c){c.classList.remove('active');});
  el.classList.add('active');
  activeFilter = el.dataset.filter;
  window.scrollTo({ top: 0 });
  renderGrid(activeFilter);
}
