/* ── Claude API Chat Engine ──────────────────────────────────────────────
   Depends on globals from data.js:         allCards, fmt, activeFilter,
                                            escHtml
   Depends on globals from components/card.js:    renderCard
   Depends on globals from ui.js:           setGridContent, updateMeta,
                                            _metaSort, openChat
   Must load after ui.js and before the inline script block.
────────────────────────────────────────────────────────────────────────── */

/* Anthropic key removed from browser scope — proxied via supabase/functions/chat */
var conversationHistory = [];

var chatState = {
  greeted:   false,
  prefTypes: [],
  prefSort:  'alpha',   /* neutral default — never score */
  prefLimit: null
};

function makeQRRow(tokens) {
  var qr = document.createElement('div');
  qr.className = 'quick-replies';
  tokens.forEach(function(label) {
    var btn = document.createElement('button');
    btn.className = 'qr-btn';
    btn.textContent = label;
    btn.addEventListener('click', function() { sendQuickReply(label, btn); });
    qr.appendChild(btn);
  });
  return qr;
}

function addMsg(text, who) {
  var msgs = document.getElementById('cp-msgs');
  var div  = document.createElement('div');
  div.className = who === 'ai' ? 'msg-ai' : 'msg-user';

  if (who !== 'ai') {
    div.textContent = text;
  } else {
    /*
     * Process lines in order so that quick-reply rows appear in-place
     * directly after the question they belong to, not all lumped at the end.
     *
     * A quick-reply line is one composed entirely of [Label] tokens.
     * Prose lines are buffered into a <span> and flushed whenever a QR line
     * (or the end of the message) is reached.
     */
    var lines = text.split('\n');
    var proseHtml  = '';
    var pendingGap = false;

    function flushProse() {
      if (!proseHtml) return;
      var span = document.createElement('span');
      span.innerHTML = proseHtml;
      div.appendChild(span);
      proseHtml  = '';
      pendingGap = false;
    }

    lines.forEach(function(line) {
      var t = line.trim();
      if (t && /^(\[[^\]]+\]\s*)+$/.test(t)) {
        /* Quick-reply line — flush any buffered prose, then add chips in-place */
        flushProse();
        var tokens = (t.match(/\[([^\]]+)\]/g) || []).map(function(tok) { return tok.slice(1, -1); });
        div.appendChild(makeQRRow(tokens));
      } else if (t === '') {
        pendingGap = true;
      } else {
        /* Prose line — buffer it */
        if (proseHtml) proseHtml += pendingGap ? '<br><br>' : '<br>';
        proseHtml += escHtml(t);
        pendingGap = false;
      }
    });

    flushProse(); /* flush any remaining prose after the last line */
  }

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function sendQuickReply(label, btn) {
  /* Mark the chosen option and quietly recede the rest in this row */
  if (btn) {
    var row = btn.parentNode;
    Array.prototype.forEach.call(row.querySelectorAll('.qr-btn'), function(b) {
      b.classList.add(b === btn ? 'selected' : 'used');
      b.disabled = true;
    });
  }
  document.getElementById('cp-input').value = label;
  sendChat();
}

function addTyping() {
  var msgs = document.getElementById('cp-msgs');
  var div  = document.createElement('div');
  div.className = 'msg-ai'; div.id = 'typing';
  div.innerHTML = '<div class="typing"><div class="dot-t"></div><div class="dot-t"></div><div class="dot-t"></div></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

/* Apply a personalised card view driven by the AI */
function applyAIView(opts) {
  opts = opts || {};
  var cards = allCards.slice();
  /* Specific ID filter takes priority over type filter */
  if (opts.ids && opts.ids.length) {
    cards = cards.filter(function(c) { return opts.ids.indexOf(c.id) >= 0; });
  } else if (opts.types && opts.types.length) {
    cards = cards.filter(function(c) { return opts.types.indexOf(c.type) >= 0; });
  }
  if (opts.excludeSuppressed) {
    cards = cards.filter(function(c) { return !c.sup30; });
  }
  if (opts.positiveOnly) {
    cards = cards.filter(function(c) { return c.t30 > 0; });
  }
  var sort = opts.sort || chatState.prefSort;
  if (sort === 'score') {
    cards.sort(function(a,b) { return (b.s30||0) - (a.s30||0); });
  } else if (sort === 'trend') {
    cards.sort(function(a,b) { return (b.t30||0) - (a.t30||0); });
  } else if (sort === 'confidence') {
    var co = {High:0, Medium:1, Low:2};
    cards.sort(function(a,b) { return (co[a.conf30]||3) - (co[b.conf30]||3); });
  } else {
    /* alpha — restore neutral A-Z order from the source dataset */
    cards.sort(function(a,b) { return a.name.localeCompare(b.name); });
  }
  if (opts.limit && opts.limit > 0) {
    cards = cards.slice(0, opts.limit);
  }
  var grid = document.getElementById('card-grid');
  if (!cards.length) { setGridContent('<div class="state-msg">No matching properties found.</div>'); return 0; }
  setGridContent(cards.map(renderCard).join(''));
  document.querySelectorAll('.chip[data-filter]').forEach(function(c) { c.classList.remove('active'); });
  updateMeta(cards.length, allCards.length);
  return cards.length;
}

/* Execute CMD tags returned by Claude */
function executeCmds(cmds) {
  var types      = chatState.prefTypes.slice();
  var sort       = chatState.prefSort;
  var limit      = chatState.prefLimit;
  var excludeSup  = false;
  var showSupOnly = false;
  var positiveOnly = false;
  var showIds     = null;

  console.log('[SponsorAI] executeCmds:', cmds);
  cmds.forEach(function(cmd) {
    if (cmd === 'all')                { types = []; showIds = null; limit = null; positiveOnly = false; sort = 'alpha'; }
    else if (cmd.indexOf('show:') === 0) {
      showIds = cmd.slice(5).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      console.log('[SponsorAI] show IDs parsed:', showIds);
      console.log('[SponsorAI] matching cards:', allCards.filter(function(c){ return showIds.indexOf(c.id)>=0; }).map(function(c){ return c.name; }));
    }
    else if (cmd.indexOf('limit:') === 0) {
      var n = parseInt(cmd.slice(6), 10);
      if (!isNaN(n) && n > 0) limit = n;
    }
    else if (cmd === 'filter:driver')  { types = ['driver'];         showIds = null; }
    else if (cmd === 'filter:athlete') { types = ['athlete'];        showIds = null; }
    else if (cmd === 'filter:team')    { types = ['team'];           showIds = null; }
    else if (cmd === 'filter:series')  { types = ['series'];         showIds = null; }
    else if (cmd === 'filter:event')   { types = ['event'];          showIds = null; }
    else if (cmd === 'filter:venue')   { types = ['venue'];          showIds = null; }
    else if (cmd === 'sort:score')      { sort = 'score'; }
    else if (cmd === 'sort:trend')      { sort = 'trend'; }
    else if (cmd === 'sort:confidence') { sort = 'confidence'; }
    else if (cmd === 'clean')           { excludeSup = true; }
    else if (cmd === 'positive')        { positiveOnly = true; sort = 'trend'; }
    else if (cmd === 'suppressed')      { showSupOnly = true; }
    else if (cmd === 'top')             { sort = 'score'; excludeSup = true; showIds = null; }
  });

  chatState.prefTypes = types;
  chatState.prefSort  = sort;
  chatState.prefLimit = limit;
  _metaSort           = sort;  /* keep meta label in sync */

  if (showSupOnly) {
    var sup = allCards.filter(function(c) { return c.sup30; });
    var g = document.getElementById('card-grid');
    g.innerHTML = sup.length ? sup.map(renderCard).join('') : '<div class="state-msg">No suppressed properties.</div>';
    document.querySelectorAll('.chip[data-filter]').forEach(function(c) { c.classList.remove('active'); });
    updateMeta(sup.length, allCards.length);
  } else {
    applyAIView({ ids: showIds, types: types, sort: sort, excludeSuppressed: excludeSup, positiveOnly: positiveOnly, limit: limit });
  }
}

/* Build dynamic system prompt with live data context */
function buildSystemPrompt() {
  var byT = {};
  allCards.forEach(function(c) { byT[c.type] = (byT[c.type]||0)+1; });
  var sup    = allCards.filter(function(c) { return c.sup30; }).length;
  var top    = allCards.filter(function(c) { return !c.sup30 && c.s30 != null; })[0];
  var rising = allCards.filter(function(c) { return !c.sup30 && c.t30 > 0.1; }).length;
  var driversWithTeam = allCards.filter(function(c) { return (c.type === 'driver' || c.type === 'athlete') && c.teamNames && c.teamNames.length; }).length;

  /* Build team roster directly from driver/athlete cards — guarantees IDs match card IDs exactly.
     Multi-team athletes (e.g. cross-series) appear under each of their teams. */
  var rosterMap = {};
  allCards.filter(function(c){ return (c.type==='driver' || c.type==='athlete') && c.teamNames && c.teamNames.length; })
    .forEach(function(d){
      d.teamNames.forEach(function(tName){
        if (!rosterMap[tName]) rosterMap[tName] = [];
        rosterMap[tName].push(d.name + ' [' + d.id + ']');
      });
    });
  var teamRoster = '';
  Object.keys(rosterMap).sort().forEach(function(tName){
    teamRoster += '\n  ' + tName + ': ' + rosterMap[tName].join(', ');
  });

  /* Build driver/athlete index: name + all teams (/ separated for multi-team) + ID */
  var driverIndex = '';
  allCards.filter(function(c){ return c.type==='driver' || c.type==='athlete'; })
    .sort(function(a,b){
      return ((a.teamNames&&a.teamNames[0])||'').localeCompare((b.teamNames&&b.teamNames[0])||'');
    })
    .forEach(function(d){
      var teamsStr = (d.teamNames && d.teamNames.length) ? d.teamNames.join(' / ') : '';
      driverIndex += '\n  ' + d.name + (teamsStr ? ' (' + teamsStr + ')' : '') + ' [' + d.id + ']';
    });

  return [
    'You are the SponsorAI assistant.',
    'Your role is to help users make structured sponsorship decisions calmly and clearly.',
    'You are not a chatbot. You are a guided analytical assistant.',
    '',
    '--- SYSTEM MODES ---',
    'You operate in two internal modes. Default to Decision Mode unless the user explicitly requests deeper explanation.',
    '',
    'DECISION MODE (default):',
    'Use quick reply options wherever possible. Ask a maximum of two clarifying questions at a time.',
    'Keep responses tight and structured. Avoid long explanations. Progress the decision quickly. Focus on narrowing, not expanding.',
    'Do not drift into essay-style responses in Decision Mode.',
    '',
    'IMPORTANT — questions with different decision outcomes must never be bundled together.',
    'Wrong: asking "Are you exploring or deciding?" and "What category?" in the same message — each leads to a completely different path.',
    'Right: ask one question, wait for the answer, then ask the next based on what the user said.',
    'Only bundle two questions if they are tightly related and share the same option set.',
    '',
    'EXPLORE MODE:',
    'Activates when the user explicitly asks for deeper explanation, methodology, reasoning, or trade-offs.',
    'Provide structured explanations using short paragraphs. Maintain analytical tone. Do not expand beyond what was asked.',
    '',
    '--- CORE BEHAVIOUR ---',
    'When structured input is required: present small, clearly defined choices as quick reply options. Keep it lightweight and fast.',
    'Users may select an option or type freely. Treat both equally.',
    '',
    '--- FORMATTING RULES ---',
    'When asking structured questions:',
    '  - Start with a short calm intro line.',
    '  - Number questions only if asking more than one (and only when tightly related).',
    '  - Place each question on its own line.',
    '  - Place the options directly under the question they belong to.',
    '',
    'Example (single question):',
    '  Where are you in the process?',
    '  [Exploring options] [Have candidates] [Not sure]',
    '',
    'Example (two tightly related questions):',
    '  Two quick things:',
    '  1) What market are you targeting?',
    '  [Local] [National] [Global] [Not sure]',
    '  2) What is your primary objective?',
    '  [Awareness] [Consideration] [Sales] [Hospitality] [Not sure]',
    '',
    'Option rules: 1-3 words per option. No punctuation. Max 6 options. Include "Not sure" or "Other" where appropriate.',
    'Default to single select. Only use multi-select when genuinely necessary — if so, include [Continue] and [None of these].',
    '',
    '--- CONTEXTUAL FOLLOW-ON LAYER ---',
    'When the user is viewing or discussing a specific object (driver, team, series, event), anticipate 2-3 logical next questions they may have.',
    'Present these as optional prompts under a short neutral heading: "You might also want to know:"',
    '',
    'Examples for a DRIVER: [Compare to similar drivers] [Regional fan breakdown] [Sponsorship inventory] [Growth trend] [Budget range]',
    'Examples for a TEAM: [Grid position stability] [Manufacturer backing] [Hospitality footprint] [Digital vs live audience] [Season calendar]',
    'Examples for a SERIES: [Audience profile] [Geographic strength] [Title sponsor history] [Media rights coverage] [Entry tier comparison]',
    '',
    'Rules: offer 2-3 suggestions max. Make them relevant to the object type. Do not repeat previously answered questions.',
    'These should feel intelligent and anticipatory, not interrogative. Keep them optional, never forced.',
    '',
    '--- MOTORSPORT VOCABULARY ---',
    'Use motorsport terminology naturally where relevant: series, championship, grid, paddock, race weekend, tier, works team, privateer, manufacturer-backed, trackside exposure, hospitality footprint, fanbase density, sponsorship inventory.',
    'Do not use racing metaphors, fan language, or commentary tone. Maintain analytical clarity at all times.',
    '',
    '--- GUARDRAILS ---',
    'Never present scores as verdicts. Never imply guaranteed outcomes or ROI certainty. Never declare winners in comparisons.',
    'Never fabricate missing data. Never overstate confidence.',
    'FanScore reflects audience strength — it is a signal, not a truth, and does not predict ROI.',
    'FitScore indicates scenario-specific suitability — it is directional, not a valuation.',
    'When data is limited or volatile: "Data coverage is limited." / "Treat this as directional."',
    '',
    'If asked for "the best" property: clarify intent first with a quick reply question, then present a short unranked shortlist with reasoning. Never declare a winner.',
    'When comparing: highlight trade-offs neutrally. "Property A shows broader reach, while Property B demonstrates deeper engagement."',
    '',
    '--- TONE ---',
    'Calm. Analytical. Neutral. Structured. Light but professional.',
    'Avoid: over-enthusiasm, sales tone, exclamation marks, emoji, long paragraphs.',
    'Do not use markdown, bullet points, or em dashes in responses.',
    '',
    '--- STRICT DISCIPLINE ---',
    'Clarity over volume. Structure over personality. Progress over prose. Precision over hype.',
    '',
    '--- LIVE DATA CONTEXT ---',
    'Current dataset: ' + allCards.length + ' properties — ' +
      (byT.driver||0) + ' drivers, ' + (byT.athlete||0) + ' athletes, ' +
      (byT.team||0) + ' teams, ' +
      (byT.series||0) + ' series, ' + (byT.event||0) + ' events, ' +
      (byT.venue||0) + ' venues, ' + (byT.governing_body||0) + ' governing bodies. ' +
      sup + ' have suppressed 30-day windows (low data coverage). ' +
      rising + ' showing positive 30-day momentum. ' +
      (top ? 'Highest FanScore: ' + top.name + ' at ' + fmt(top.s30,1) + '. ' : '') +
      driversWithTeam + ' drivers/athletes have a linked team.',
    '',
    '--- TEAM ROSTERS (use IDs with [CMD:show:...]) ---' + teamRoster,
    '',
    '--- DRIVER / ATHLETE INDEX ---' + driverIndex,
    '',
    '--- CARD GRID COMMANDS ---',
    'To update the card grid, append silent commands at the very end of your response — invisible to the user, consumed by the frontend.',
    '',
    '[CMD:show:id1,id2,...] — show ONLY the specific properties with these IDs. Use this when the user asks about specific drivers, a team\'s roster, or any named set of properties. IDs come from the rosters above.',
    '[CMD:limit:N] — after filtering and sorting, show only the top N cards. Use whenever the user asks for a specific number (e.g. "top 5", "show me 3"). Combine with sort and filter commands. Use [CMD:all] to clear the limit.',
    '[CMD:all] — clear all filters, limits, and show all properties',
    '[CMD:filter:driver] — show only drivers (all of them)',
    '[CMD:filter:athlete] — show only athletes (use this for British GT and similar series with athlete-typed properties)',
    '[CMD:filter:team] — show only teams',
    '[CMD:filter:series] — show only series',
    '[CMD:filter:event] — show only events',
    '[CMD:filter:venue] — show only venues',
    '[CMD:sort:score] — sort by FanScore descending',
    '[CMD:sort:trend] — sort by 30-day momentum',
    '[CMD:sort:confidence] — sort by data confidence',
    '[CMD:top] — top performers only (excludes suppressed)',
    '[CMD:clean] — exclude suppressed windows',
    '[CMD:positive] — show only properties with positive 30-day momentum (t30 > 0), sorted by trend. Use this when the user asks for rising/trending/gaining properties.',
    '[CMD:suppressed] — show only suppressed properties',
    '',
    'Examples:',
    '  "show me the top 5 drivers by momentum" → [CMD:filter:driver][CMD:sort:trend][CMD:limit:5]',
    '  "show drivers with positive momentum" → [CMD:filter:driver][CMD:positive]',
    '  "show British GT athletes" → [CMD:filter:athlete]',
    '  "show the 2 athletes for Barwell" → [CMD:show:athleteId1,athleteId2]',
    '  "show the 2 drivers for Eclipse" → [CMD:show:driverId1,driverId2]',
    '  "expand to top 10" → [CMD:filter:driver][CMD:sort:trend][CMD:limit:10]',
    '  "show everything again" → [CMD:all]',
    '',
    'Combine freely. Update the grid proactively. Never mention or explain commands to the user.'
  ].join('\n');
}

/* ── Claude API send ──────────────────────────────────────────────────── */

function sendChat() {
  var input = document.getElementById('cp-input');
  var q = input.value.trim();
  if (!q) return;

  addMsg(q, 'user');
  input.value = '';
  addTyping();

  conversationHistory.push({ role: 'user', content: q });

  var MAX_ATTEMPTS = 3;
  var RETRY_DELAYS = [1200, 2500]; /* ms between attempts 1→2 and 2→3 */

  function attempt(n) {
    fetch('https://kyjpxxyaebxvpprugmof.supabase.co/functions/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify({
        system: buildSystemPrompt(),
        messages: conversationHistory
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      /* Overloaded / server error — retry if attempts remain */
      if (data.error) {
        var retryable = data.error.type === 'overloaded_error' || (data.error.status >= 500);
        if (retryable && n < MAX_ATTEMPTS) {
          setTimeout(function() { attempt(n + 1); }, RETRY_DELAYS[n - 1] || 2000);
          return;
        }
        /* Out of retries or non-retryable error */
        var typing = document.getElementById('typing');
        if (typing) typing.remove();
        addMsg('Having trouble connecting right now. Please try again in a moment.', 'ai');
        console.error('API error after ' + n + ' attempt(s):', data.error);
        return;
      }

      var typing = document.getElementById('typing');
      if (typing) typing.remove();

      var raw = (data.content && data.content[0]) ? data.content[0].text : 'Sorry, something went wrong.';

      /* Extract and execute CMD tags — strip them from display text */
      var cmds = [];
      var text = raw.replace(/\[CMD:([^\]]+)\]/g, function(_, cmd) {
        cmds.push(cmd.trim());
        return '';
      }).trim();

      if (cmds.length) executeCmds(cmds);

      conversationHistory.push({ role: 'assistant', content: raw });
      addMsg(text, 'ai');
    })
    .catch(function(err) {
      /* Network / fetch failure — retry if attempts remain */
      if (n < MAX_ATTEMPTS) {
        setTimeout(function() { attempt(n + 1); }, RETRY_DELAYS[n - 1] || 2000);
        return;
      }
      var typing = document.getElementById('typing');
      if (typing) typing.remove();
      addMsg('Having trouble connecting right now. Please try again in a moment.', 'ai');
      console.error('Fetch error after ' + n + ' attempt(s):', err);
    });
  }

  attempt(1);
}
