/* ── Layout ──────────────────────────────────────────────────────────────
   Depends on: updateGhostMeta() — defined in the inline script.
   Called at runtime only (via setTimeout in setLayout), never at parse time.
   Must load after components/card.js and before the inline script block.
────────────────────────────────────────────────────────────────────────── */
var activeLayout = 'grid';

/* JS masonry engine — places cards absolutely into the shortest column.
   DOM order is preserved. No rank/tier signals are introduced. */
function layoutMasonry() {
  var grid = document.getElementById('card-grid');
  if (!grid || !grid.classList.contains('masonry')) return;

  /* Inject ghost placeholder at position 0 if not already present */
  if (!grid.querySelector('.masonry-ghost')) {
    var ghost = document.createElement('div');
    ghost.className = 'fanscore-card masonry-ghost';
    ghost.innerHTML = '<div id="ghost-meta-wrap"></div>';
    grid.insertBefore(ghost, grid.firstChild);
    /* Populate immediately if meta is already available */
    updateGhostMeta();
  }

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.fanscore-card'));
  if (!cards.length) return;

  var gap      = 18;
  var gridW    = grid.offsetWidth;
  var minColW  = 280;  /* match grid's minmax(280px, 1fr) */
  var cols     = Math.max(1, Math.floor((gridW + gap) / (minColW + gap)));
  var colW     = Math.floor((gridW - (cols - 1) * gap) / cols);

  /* Set card widths and make them static for height measurement */
  cards.forEach(function(c) {
    c.style.position = 'static';
    c.style.left     = '';
    c.style.top      = '';
    c.style.width    = colW + 'px';
  });

  /* Force a synchronous reflow so all width changes are applied
     before we read heights — prevents stale layout measurements */
  void grid.offsetHeight;

  /* Read heights after reflow */
  var heights = cards.map(function(c) { return c.offsetHeight; });

  /* Initialise column cursors */
  var colH = [];
  for (var i = 0; i < cols; i++) colH.push(0);

  /* Place each card into the shortest column */
  grid.style.position = 'relative';
  cards.forEach(function(c, idx) {
    var col = 0;
    for (var j = 1; j < cols; j++) {
      if (colH[j] < colH[col]) col = j;
    }
    c.style.position = 'absolute';
    c.style.left     = (col * (colW + gap)) + 'px';
    c.style.top      = colH[col] + 'px';
    colH[col] += heights[idx] + gap;
  });

  grid.style.height = Math.max.apply(null, colH) + 'px';
}

function clearMasonryPositions() {
  var grid = document.getElementById('card-grid');
  if (!grid) return;
  /* Remove ghost placeholder */
  Array.prototype.forEach.call(grid.querySelectorAll('.masonry-ghost'), function(g) {
    g.parentNode.removeChild(g);
  });
  grid.style.position = '';
  grid.style.height   = '';
  Array.prototype.forEach.call(grid.querySelectorAll('.fanscore-card'), function(c) {
    c.style.position = '';
    c.style.left     = '';
    c.style.top      = '';
    c.style.width    = '';
  });
}

function setLayout(mode) {
  var grid = document.getElementById('card-grid');
  var prevLayout = activeLayout;

  /* Scroll back to top so the new layout starts at the beginning */
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* Sync buttons and persist immediately */
  ['grid', 'masonry', 'list'].forEach(function(m) {
    var btn = document.getElementById('layout-' + m);
    if (btn) {
      btn.classList.toggle('active', m === mode);
      btn.setAttribute('aria-pressed', String(m === mode));
    }
  });
  localStorage.setItem('sai-layout', mode);

  /* Fade out current view, then switch */
  grid.classList.remove('anim-in');
  grid.classList.add('anim-out');

  setTimeout(function() {
    grid.classList.remove('anim-out');

    /* Clear masonry absolute positions before leaving masonry */
    if (prevLayout === 'masonry') clearMasonryPositions();

    activeLayout = mode;
    grid.classList.remove('masonry', 'list');
    if (mode === 'masonry') grid.classList.add('masonry');
    if (mode === 'list')    grid.classList.add('list');

    var content = document.querySelector('.content');
    if (content) content.classList.toggle('masonry-mode', mode === 'masonry');

    if (mode === 'masonry') {
      /* Hide before any paint — prevents full-width placeholder flash */
      grid.style.visibility = 'hidden';
      setTimeout(function() {
        layoutMasonry();
        grid.style.visibility = '';
        grid.classList.remove('anim-in'); void grid.offsetHeight; grid.classList.add('anim-in');
        setTimeout(layoutMasonry, 400);
      }, 50);
    } else {
      grid.classList.remove('anim-in'); void grid.offsetHeight; grid.classList.add('anim-in');
    }
  }, 180); /* matches grid-out duration */
}
