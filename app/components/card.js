/* ── Card render ──────────────────────────────────────────────────────────
   Depends on globals from data.js:
   TYPE, n, fmt, arr, arrC, countryFlag
   Must load after data.js.
────────────────────────────────────────────────────────────────────────── */

var HERO_ICONS = {
  driver: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="20" r="11" stroke="currentColor" stroke-width="3.5"/><path d="M10 54c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
  team:   '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 36h48" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M12 36l4-10h32l4 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 26l3-8h26l3 8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="41" r="5" stroke="currentColor" stroke-width="3"/><circle cx="44" cy="41" r="5" stroke="currentColor" stroke-width="3"/><path d="M25 36h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/></svg>',
  event:  '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="32" cy="34" rx="22" ry="14" stroke="currentColor" stroke-width="3.5"/><path d="M32 20v28M10 34h44" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/><ellipse cx="32" cy="34" rx="11" ry="14" stroke="currentColor" stroke-width="2.5" opacity="0.5"/><path d="M18 22.5c3.8 2 8.7 3.2 14 3.2s10.2-1.2 14-3.2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/><path d="M18 45.5c3.8-2 8.7-3.2 14-3.2s10.2 1.2 14 3.2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/></svg>',
  series: '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12h24v18c0 8-6 14-12 16-6-2-12-8-12-16V12z" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 18H10c0 8 4 13 10 15" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 18h10c0 8-4 13-10 15" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 46v6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M22 52h20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
};

function renderCard(c, idx) {
  var cfg=TYPE[c.type]||{label:c.type,bgVar:'var(--surface-muted)',fgVar:'var(--text-2)',softVar:'var(--accent)'};
  var sup=!!c.sup30;
  var delayVal = idx > 0 ? 'animation-delay:' + (Math.min(idx, 24) * 0.022).toFixed(3) + 's;' : '';
  var delay = ' style="--card-type-fg:' + cfg.fgVar + ';--card-type-soft:' + (cfg.softVar||cfg.fgVar) + ';' + delayVal + '"';

  var m = c.imageMeta;
  var heroBg = (m && m.bg) ? m.bg : cfg.bgVar;
  var heroHtml = '<div class="card-hero" style="background:'+heroBg+'">';
  if (m) {
    var imgStyle = 'object-fit:'+m.fit+';object-position:'+m.pos;
    if (m.pad) imgStyle += ';padding:'+m.pad+';box-sizing:border-box';
    heroHtml += '<img src="'+m.url+'" alt="'+c.name+'" loading="lazy" data-img-kind="'+m.kind+'" style="'+imgStyle+'">';
  } else {
    heroHtml += '<div class="card-hero-placeholder" style="color:'+cfg.fgVar+'">'+(HERO_ICONS[c.type]||HERO_ICONS.series)+'</div>';
  }
  heroHtml += '</div>';

  return '<div class="fanscore-card"' + delay + ' data-type="'+c.type+'" data-id="'+c.id
    +'" onclick="selectCard(\''+c.id+'\')" tabindex="0" role="article"'
    +' onkeydown="if(event.key===\'Enter\'||event.key===\' \')selectCard(\''+c.id+'\')">'

    +heroHtml

    +'<div class="card-body">'
    +'<div class="card-header">'
    +'<div class="card-name-row">'
    +'<div class="card-name" title="'+c.name+'">'+c.name+'</div>'
    +(c.country?'<span class="country-tag">'+countryFlag(c.country)+'</span>':'')
    +'</div>'
    +'<div class="card-badges">'
    +'<span class="type-badge" style="background:'+cfg.bgVar+';color:'+cfg.fgVar+';border-color:'+cfg.fgVar+'33">'+cfg.label+'</span>'
    +'</div>'
    +((c.type==='driver'||c.type==='athlete')&&c.teamNames&&c.teamNames.length
      ?'<div class="team-plain">'+c.teamNames[0]+'</div>'
      :c.type==='team'&&c.driverNames&&c.driverNames.length
        ?'<div class="team-plain">'+c.driverNames.join(' | ')+'</div>'
        :'<div class="team-plain empty">&nbsp;</div>'
    )
    +'</div>'

    +'<div class="score-row">'
    +'<div class="score-main">'
    +'<div class="score-val'+(sup?' dim':'')+'"'+(sup?'':' style="color:'+cfg.scoreVar+'"')+'>'+( sup?'--':fmt(c.s30,1))+'</div>'
    +'<div class="score-lbl">FanScore &middot; 30d avg</div>'
    +(c.followers!=null&&c.followers>0?'<div class="follower-chip">'+fmtFollowers(c.followers)+' followers</div>':'')
    +'</div>'
    +'<div class="score-aside">'
    +(!sup&&c.t30!=null?'<div class="trend-line" style="color:'+arrC(c.t30)+'">'+arr(c.t30)+' '+Math.abs(c.t30).toFixed(2)+'/d</div>':'')
    +(c.conf30?'<div class="conf-line">'+c.conf30+' confidence</div>':'')
    +(c.cov30!=null?'<div class="conf-line">'+(c.cov30*100).toFixed(0)+'% coverage</div>':'')
    +'</div></div>'

    +(c.bio ? '<div class="card-bio">'+c.bio.slice(0,240)+'</div>' : '')

    +(sup?'<div class="sup-notice">'+c.sup30+'</div>':'')

    +'<div class="card-actions">'
    +'<button class="card-btn" data-action="watchlist" data-id="'+c.id+'" title="Add to watchlist"><i data-lucide="bookmark"></i></button>'
    +'<button class="card-btn'+(typeof compareList!=='undefined'&&compareList.indexOf(c.id)>=0?' active':'')+'" data-action="compare" data-id="'+c.id+'" title="Compare"><i data-lucide="check-check"></i></button>'
    +'<button class="card-btn" data-action="portfolio" data-id="'+c.id+'" title="Add to portfolio"><i data-lucide="briefcase"></i></button>'
    +'</div>'

    +'</div>'  // .card-body
    +'</div>';
}
