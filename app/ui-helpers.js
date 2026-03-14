/* ── SponsorAI Public UI Helpers ─────────────────────────────────────────
   Shared reusable helpers for all public-facing pages.

   Load order: after ui.js (requires applyTheme, navMenuOpen, closeNavMenu,
   profileMenuOpen, closeProfileMenu), storage.js (SAI_STORAGE), and
   data.js (TYPE, escHtml, fmt, arr, arrC).

   Exposed as: window.SAI_UIH
   Also exposes: window.navigateTo (global alias used by inline onclick handlers)

   Before creating new UI fragments, formatting helpers, or saved-state
   helpers in a page, check here first. Prefer extending SAI_UIH over
   creating page-local duplicates.
─────────────────────────────────────────────────────────────────────────── */

window.SAI_UIH = (function() {

  /* ── Theme init ────────────────────────────────────────────────────────
     Reads sai-theme from localStorage and applies dark/light. Falls back
     to OS preference if no saved value. Call once at the top of each page's
     inline script block.                                                   */
  function initTheme() {
    var saved       = localStorage.getItem('sai-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme       = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  /* ── Navigation ─────────────────────────────────────────────────────── */
  function navigateTo(page) {
    window.location.href = page;
  }

  /* ── Menu listeners (click-outside + escape key) ───────────────────────
     Closes nav and profile menus when the user clicks outside or presses
     Escape. Suitable for all pages that only have nav + profile menus.
     Pages with additional panels (sort, detail, chat) should extend this
     locally rather than calling initMenuListeners().                       */
  function initMenuListeners() {
    document.addEventListener('click', function(e) {
      var navMenu  = document.getElementById('nav-menu');
      var menuBtn  = document.getElementById('menu-btn');
      var profMenu = document.getElementById('profile-menu');
      var profBtn  = document.getElementById('profile-btn');

      if (navMenuOpen && navMenu && menuBtn &&
          !navMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        closeNavMenu();
      }
      if (profileMenuOpen && profMenu && profBtn &&
          !profMenu.contains(e.target) && !profBtn.contains(e.target)) {
        closeProfileMenu();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      if (navMenuOpen)     closeNavMenu();
      if (profileMenuOpen) closeProfileMenu();
    });
  }

  /* ── Type badge HTML ───────────────────────────────────────────────────
     Returns a themed <span> for property type display.
     Uses TYPE config from data.js (semantic tokens, dark-mode safe).
     @param {string} type         property_type value
     @param {string} [extraStyle] optional extra inline CSS string         */
  function typeBadgeHtml(type, extraStyle) {
    var cfg = (typeof TYPE !== 'undefined' && TYPE[type])
      || { label: type, bgVar: 'var(--surface-muted)', fgVar: 'var(--text-2)' };
    var style =
      'display:inline-block;' +
      'padding:2px 8px;' +
      'border-radius:var(--radius-sm);' +
      'font-size:var(--text-xs);' +
      'font-weight:500;' +
      'background:' + cfg.bgVar + ';' +
      'color:' + cfg.fgVar + ';' +
      (extraStyle || '');
    return '<span style="' + style + '">' + escHtml(cfg.label || type) + '</span>';
  }

  /* ── FanScore text ─────────────────────────────────────────────────────
     Returns '--' when suppressed, otherwise the formatted 30d avg score.
     Reads suppression_reason_30d and avg_score_30d from a property object.
     @param {object} prop   property data object
     @param {number} [dp]   decimal places (default 1)                     */
  function fanScoreText(prop, dp) {
    if (!prop || prop.suppression_reason_30d) return '--';
    return fmt(prop.avg_score_30d, dp != null ? dp : 1);
  }

  /* ── Trend text ────────────────────────────────────────────────────────
     Returns formatted trend string e.g. "↑ 0.43/d" or '--'.
     @param {number|null} val  trend_value_30d                             */
  function trendText(val) {
    if (val == null) return '--';
    return arr(val) + ' ' + Math.abs(val).toFixed(2) + '/d';
  }

  /* Returns the CSS color variable for a trend direction.
     @param {number|null} val  trend_value_30d                             */
  function trendColor(val) {
    return arrC(val);
  }

  /* ── Property count text ───────────────────────────────────────────────
     Formats a property count with a noun.
     @param {number} count
     @param {string} [noun]    singular noun (default 'property')
     Examples: propertyCountText(0) => 'No properties'
               propertyCountText(1) => '1 property'
               propertyCountText(4) => '4 properties'                      */
  function propertyCountText(count, noun) {
    noun = noun || 'property';
    var plural = noun + 's';
    if (count === 0) return 'No ' + plural;
    if (count === 1) return '1 ' + noun;
    return count + ' ' + plural;
  }

  /* ── Saved-state checks ────────────────────────────────────────────────
     Thin wrappers around SAI_STORAGE that are safe to call before storage
     is loaded (guard included).                                            */
  function isOnWatchlist(slug) {
    return typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.watchlist.has(slug);
  }
  function isInPortfolio(slug) {
    return typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.portfolio.has(slug);
  }
  function isInCompare(slug) {
    return typeof SAI_STORAGE !== 'undefined' && SAI_STORAGE.compare.has(slug);
  }

  /* ── State HTML builders ───────────────────────────────────────────────
     Produce standard state-msg div HTML. Use for loading and error states
     rather than writing inline HTML strings in page scripts.              */

  /* @param {string} msg  Error title text (will be HTML-escaped)          */
  function errorHtml(msg) {
    return '<div class="state-msg" style="color:var(--negative)">' +
           '<strong>' + escHtml(msg) + '</strong></div>';
  }

  /* @param {string} [msg]  Loading message (default 'Loading...')         */
  function loadingHtml(msg) {
    return '<div class="state-msg"><div class="spinner"></div>' +
           escHtml(msg || 'Loading...') + '</div>';
  }

  /* ── Public API ──────────────────────────────────────────────────────── */
  return {
    initTheme:          initTheme,
    navigateTo:         navigateTo,
    initMenuListeners:  initMenuListeners,
    typeBadgeHtml:      typeBadgeHtml,
    fanScoreText:       fanScoreText,
    trendText:          trendText,
    trendColor:         trendColor,
    propertyCountText:  propertyCountText,
    isOnWatchlist:      isOnWatchlist,
    isInPortfolio:      isInPortfolio,
    isInCompare:        isInCompare,
    errorHtml:          errorHtml,
    loadingHtml:        loadingHtml
  };

})();

/* ── Global alias ────────────────────────────────────────────────────────
   Exposes navigateTo as a top-level function so existing inline onclick
   handlers (e.g. onclick="navigateTo('explore.html')") work without
   change on pages that previously defined it locally.                     */
window.navigateTo = SAI_UIH.navigateTo;
