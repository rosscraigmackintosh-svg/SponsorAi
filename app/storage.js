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

  /* ── Board storage ─────────────────────────────────────────────────────
     Stores a stage-keyed object: { watching: [], shortlist: [],
     evaluation: [], confirmed: [] }.
     A slug can only exist in one stage at a time. Adding to a stage
     removes it from any previous stage automatically.                     */
  var BOARD_STAGES = ['watching', 'shortlist', 'evaluation', 'confirmed'];

  function makeBoard(key) {
    function _get() {
      try {
        var raw = localStorage.getItem(key);
        var b   = raw ? JSON.parse(raw) : {};
        BOARD_STAGES.forEach(function(s) {
          if (!Array.isArray(b[s])) b[s] = [];
        });
        return b;
      } catch(e) {
        var def = {};
        BOARD_STAGES.forEach(function(s) { def[s] = []; });
        return def;
      }
    }
    function _set(b) {
      try { localStorage.setItem(key, JSON.stringify(b)); } catch(e) {}
    }
    return {
      stages: BOARD_STAGES,

      /* Returns the full board object keyed by stage */
      getBoard: function() { return _get(); },

      /* Returns a flat array of all slugs across all stages */
      getAllSlugs: function() {
        var b = _get(), all = [];
        BOARD_STAGES.forEach(function(s) { all = all.concat(b[s]); });
        return all;
      },

      /* Returns slugs array for a specific stage */
      getStage: function(stage) { return _get()[stage] || []; },

      /* Returns the stage name the slug is in, or null */
      getSlugStage: function(slug) {
        if (!slug) return null;
        var b = _get();
        for (var i = 0; i < BOARD_STAGES.length; i++) {
          if ((b[BOARD_STAGES[i]] || []).indexOf(slug) >= 0) return BOARD_STAGES[i];
        }
        return null;
      },

      /* Returns true if the slug is on the board in any stage */
      isOnBoard: function(slug) { return !!this.getSlugStage(slug); },

      /* Adds slug to stage, removing it from any previous stage first.
         Returns true on success, false if stage is invalid.              */
      addToStage: function(slug, stage) {
        if (!slug || BOARD_STAGES.indexOf(stage) < 0) return false;
        var b = _get();
        BOARD_STAGES.forEach(function(s) {
          b[s] = (b[s] || []).filter(function(x) { return x !== slug; });
        });
        b[stage].push(slug);
        _set(b);
        return true;
      },

      /* Alias for addToStage -- moves a slug already on the board */
      moveToStage: function(slug, stage) { return this.addToStage(slug, stage); },

      /* Removes slug from the board entirely */
      removeFromBoard: function(slug) {
        if (!slug) return;
        var b = _get();
        BOARD_STAGES.forEach(function(s) {
          b[s] = (b[s] || []).filter(function(x) { return x !== slug; });
        });
        _set(b);
      }
    };
  }

  return {
    watchlist: makeList('sai-watchlist'),
    portfolio: makeList('sai-portfolio'),
    compare:   makeList('sai-compare', 4),
    board:     makeBoard('sai-board')
  };

})();
