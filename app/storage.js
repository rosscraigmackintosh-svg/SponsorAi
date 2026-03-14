/* ── SponsorAI Shared Storage Helpers ─────────────────────────────────────
   Provides consistent localStorage read/write for Watchlist, Portfolio,
   and Compare selection. Must load before any component that reads state.

   Keys:
     sai-watchlist  — JSON array of property slugs (unbounded)
     sai-portfolio  — JSON array of property slugs (unbounded)
     sai-compare    — JSON array of up to 3 property slugs (cross-page)
────────────────────────────────────────────────────────────────────────── */

var SAI_STORAGE = (function() {

  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) { return []; }
  }

  function _set(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch(e) {}
  }

  /* Factory: create a list accessor for a given key.
     max: optional cap; when list is full, oldest item is dropped to make room. */
  function makeList(key, max) {
    return {
      get: function() { return _get(key); },
      set: function(arr) { _set(key, max ? arr.slice(0, max) : arr); },

      has: function(slug) {
        if (!slug) return false;
        return _get(key).indexOf(slug) >= 0;
      },

      add: function(slug) {
        if (!slug) return false;
        var list = _get(key);
        if (list.indexOf(slug) >= 0) return false;           /* already present */
        if (max && list.length >= max) list = list.slice(1); /* drop oldest */
        list.push(slug);
        _set(key, list);
        return true;
      },

      remove: function(slug) {
        if (!slug) return;
        _set(key, _get(key).filter(function(s) { return s !== slug; }));
      },

      /* Returns true if item is now IN the list (added), false if removed. */
      toggle: function(slug) {
        if (!slug) return false;
        if (_get(key).indexOf(slug) >= 0) { this.remove(slug); return false; }
        return this.add(slug);
      }
    };
  }

  return {
    watchlist: makeList('sai-watchlist'),
    portfolio: makeList('sai-portfolio'),
    compare:   makeList('sai-compare', 3)
  };

})();
