/* ── SponsorAI Property Image Map ─────────────────────────────────────────
   Each entry is a typed image asset object:

   Required rendering fields (read by resolveImageMeta in data.js):
     src      — image URL (relative path for local assets, https:// for external)
     kind     — 'logo' | 'portrait' | 'venue' | 'series' | 'car'
     fit      — CSS object-fit value
     pos      — CSS object-position value
     pad      — optional padding inside the hero container (logos only)
     bg       — optional override for the hero background colour/token

   Optional governance fields (ignored by renderer; used by SAI_IMAGES.audit()):
     hosted      — true if the file is stored in local assets (assets/portraits/ etc.)
                   Omit for all external URLs.
     source_host — explicit host classification override. Only needed when the host
                   cannot be reliably inferred from the URL (e.g. Gatsby content-hash
                   paths that look like a CDN but are actually a team site).

   Merge strategy (applied in data.js resolveImageMeta):
     1. Direct lookup: PROPERTY_IMAGES[slug]
     2. Event fallback: PROPERTY_IMAGES[EVENT_VENUE_MAP[slug]]
     3. Otherwise: null (card renders hero placeholder icon)

   Rendering contract:
     - 'portrait' and 'venue': full-bleed cover, no padding
     - 'logo' and 'series': contained with padding, neutral bg
──────────────────────────────────────────────────────────────────────────── */

var PROPERTY_IMAGES = {

  /* ── Series — SVG logotypes, contained ──────────────────────────────── */
  'british-gt-championship': {
    src:  'https://www.britishgt.com/assets/img/british-gt-championship-logo-2024-neg.svg',
    kind: 'series',
    fit:  'contain',
    pos:  'center center',
    pad:  '18%',
    bg:   'var(--surface-muted)'
  },

  'gt-world-challenge-europe': {
    /* Active header logo from gt-world-challenge-europe.com — verified 200 2026-03-13
       Previous URL (sro-motorsports.com/assets/img/gtwce-europe-neg-250x140-2026.svg) returned 404 */
    src:  'https://www.gt-world-challenge-europe.com/assets/img/gt-world-challenge-europe-aws-neg-logo-2026.svg',
    kind: 'series',
    fit:  'contain',
    pos:  'center center',
    pad:  '18%',
    bg:   'var(--surface-muted)'
  },

  /* ── Governing Body — SVG logotype, contained ───────────────────────── */
  'sro-motorsports-group': {
    src:  'https://www.sro-motorsports.com/assets/img/sro-motorsports-group-logo-neg-250x140.svg',
    kind: 'series',
    fit:  'contain',
    pos:  'center center',
    pad:  '18%',
    bg:   'var(--surface-muted)'
  },

  /* ── Venues — aerial / circuit photography, full-bleed ──────────────── */
  'brands-hatch': {
    src:  'https://msvstatic.blob.core.windows.net/high-res/7acc82c7-91c8-4f1c-989c-39e5df7a8dfd.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'silverstone-circuit': {
    // was: https://www.silverstone.co.uk/sites/default/files/images/Gallery4.png
    src:    '../assets/venues/silverstone-circuit.png',
    kind:   'venue',
    fit:    'cover',
    pos:    'center center',
    hosted: true
  },

  'circuit-de-spa-francorchamps': {
    // was: https://www.spa-francorchamps.be/assets/9421a327-18b7-4a81-abbb-407b8ec246e0/bg-circuit.png
    src:    '../assets/venues/circuit-de-spa-francorchamps.png',
    kind:   'venue',
    fit:    'cover',
    pos:    'center center',
    hosted: true
  },

  'snetterton-circuit': {
    src:  'https://msvstatic.blob.core.windows.net/high-res/98d3f736-7dd5-43bf-b63b-41dc2c7d89df.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'oulton-park': {
    src:  'https://msvstatic.blob.core.windows.net/high-res/3e560ddf-aa58-4e01-8511-2666eeb3fde8.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'donington-park': {
    src:  'https://msvstatic.blob.core.windows.net/high-res/d68c913e-f478-4306-abdf-5ce64a15172c.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  /* ── Teams ───────────────────────────────────────────────────────────── */

  /* Logo assets — PNG/SVG from team sites or external sources — contained */
  'barwell-motorsport': {
    // was: https://barwellmotorsport.co.uk/assets/logos/logo.svg
    src:    '../assets/logos/barwell-motorsport.svg',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '14%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'century-motorsport': {
    src:  'https://www.centurymotorsport.com/wp-content/uploads/2022/08/century-motorsport-logo-red-and-white.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '12%',
    bg:   'var(--surface-muted)'
  },

  'greystone-gt': {
    src:  'https://images.squarespace-cdn.com/content/v1/57c41b159de4bb0a96dd94f0/c784f8d7-bc52-4b41-a17c-f4b408764120/Logo-4x.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '14%',
    bg:   'var(--surface-muted)'
  },

  'team-wrt': {
    src:  'https://www.w-racingteam.com/frontend/themes/wrt/assets/img/racing/landing/wrt-logo-full.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '14%',
    bg:   'var(--surface-muted)'
  },

  /* Livery / car photos from britishgt.com — full-bleed cover with zoom ── */
  'optimum-motorsport': {
    src:  'https://www.britishgt.com/images/teams/team_338.png',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'beechdean-amr': {
    src:  'https://www.britishgt.com/images/teams/team_337.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  '2-seas-motorsport': {
    src:  'https://www.britishgt.com/images/teams/team_339.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'orange-racing-by-jmh': {
    src:  'https://www.britishgt.com/images/teams/team_318.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'garage-59': {
    src:  'https://www.britishgt.com/images/teams/team_293.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'paddock-motorsport': {
    src:  'https://www.britishgt.com/images/teams/team_282.jpeg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'team-abba-racing': {
    src:  'https://www.britishgt.com/images/teams/team_285.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'blackthorn-motorsport': {
    src:  'https://www.britishgt.com/images/teams/team_299.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'ram-racing': {
    src:  'https://www.britishgt.com/images/teams/team_284.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  'team-rjn': {
    src:  'https://www.britishgt.com/images/teams/team_288.jpg',
    kind: 'car',
    fit:  'cover',
    pos:  'center center'
  },

  /* ── Athletes — portrait photography, centre-top crop ───────────────── */

  /* britishgt.com driver portraits */
  'adam-smalley': {
    src:  'https://www.britishgt.com/images/drivers/driver_1180.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'alex-buncombe': {
    src:  'https://www.britishgt.com/images/drivers/driver_1152.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'alex-martin': {
    src:  'https://www.britishgt.com/images/drivers/driver_1101.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'andrew-howard': {
    src:  'https://www.britishgt.com/images/drivers/driver_1281.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'carl-cavers': {
    src:  'https://www.britishgt.com/images/drivers/driver_1133.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'chris-sakeld': {
    src:  'https://www.britishgt.com/images/drivers/driver_1287.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'giacomo-petrobelli': {
    src:  'https://www.britishgt.com/images/drivers/driver_1272.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'ian-loggie': {
    src:  'https://www.britishgt.com/images/drivers/driver_1162.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'jessica-hawkins': {
    src:  'https://www.britishgt.com/images/drivers/driver_1190.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'john-ferguson': {
    src:  'https://www.britishgt.com/images/drivers/driver_1149.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'jonny-adam': {
    src:  'https://www.britishgt.com/images/drivers/driver_1271.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'josh-rowledge': {
    src:  'https://www.britishgt.com/images/drivers/driver_1182.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'kevin-tse': {
    src:  'https://www.britishgt.com/images/drivers/driver_1277.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'lewis-plato': {
    src:  'https://www.britishgt.com/images/drivers/driver_1134.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'marcus-clutton': {
    src:  'https://www.britishgt.com/images/drivers/driver_1248.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'mark-radcliffe': {
    src:  'https://www.britishgt.com/images/drivers/driver_1165.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'mark-smith': {
    src:  'https://www.britishgt.com/images/drivers/driver_1246.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'martin-plowman': {
    src:  'https://www.britishgt.com/images/drivers/driver_1245.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'matt-topham': {
    src:  'https://www.britishgt.com/images/drivers/driver_1295.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  /* Maxime Martin and Valentino Rossi race GTWCE not British GT;
     images from the GT World Challenge Europe driver portal */
  'maxime-martin': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3739.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'maximilian-gotz': {
    src:  'https://www.britishgt.com/images/drivers/driver_1278.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'michael-johnston': {
    src:  'https://www.britishgt.com/images/drivers/driver_1178.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'mike-price': {
    src:  'https://www.britishgt.com/images/drivers/driver_1137.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'morgan-tillbrook': {
    src:  'https://www.britishgt.com/images/drivers/driver_1260.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'phil-keen': {
    src:  'https://www.britishgt.com/images/drivers/driver_1291.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'raffaele-marciello': {
    src:  'https://www.britishgt.com/images/drivers/driver_1150.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'richard-neary': {
    src:  'https://www.britishgt.com/images/drivers/driver_1148.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'ricky-collard': {
    src:  'https://www.britishgt.com/images/drivers/driver_1157.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'rob-collard': {
    src:  'https://www.britishgt.com/images/drivers/driver_1257.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'sam-neary': {
    src:  'https://www.britishgt.com/images/drivers/driver_1244.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'sandy-mitchell': {
    src:  'https://www.britishgt.com/images/drivers/driver_1265.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'shaun-balfe': {
    src:  'https://www.britishgt.com/images/drivers/driver_1179.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'simon-orange': {
    src:  'https://www.britishgt.com/images/drivers/driver_1247.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'simon-watts': {
    src:  'https://www.britishgt.com/images/drivers/driver_1151.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'tom-gamble': {
    src:  'https://www.britishgt.com/images/drivers/driver_1164.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'tom-roche': {
    src:  'https://www.britishgt.com/images/drivers/driver_1171.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'valentino-rossi': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3989.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  /* callum-macleod — no profile page found on britishgt.com or GTWCE;
     falls through to placeholder hero icon */

  /* Note: Several GTWCE athlete portraits confirmed missing (2026-03-13 audit):
     - timur-boguslavskiy: GTWCE gallery exists (driver_id 2090/2692) but portrait
       photo_id could not be confirmed without direct portal access; falls through
       to placeholder hero icon.
     - marco-varrone: no driver page found on GTWCE portal under this name; the
       Varrone drivers on GTWCE are "Nico Varrone" / "Nicolas Varrone" — entity
       name may need reconciliation; falls through to placeholder hero icon.
     Both should be revisited when GTWCE portal access is confirmed. */

  /* ── GTWCE Venues — circuit aerial / pitlane photography ─────────────── */
  'circuit-de-barcelona-catalunya': {
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Circuit_de_Barcelona-Catalunya,_April_19,_2018_SkySat.jpg/1280px-Circuit_de_Barcelona-Catalunya,_April_19,_2018_SkySat.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'autodromo-nazionale-monza': {
    /* Wikimedia Commons aerial — hotlink-safe, no referer required */
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Monza_aerial_photo.jpg/1280px-Monza_aerial_photo.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'circuit-paul-ricard': {
    /* Wikimedia Commons SkySat aerial, April 22 2018 — hotlink-safe */
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg/1280px-Circuit_Paul_Ricard,_April_22,_2018_SkySat.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'misano-world-circuit': {
    /* Wikimedia Commons aerial — hotlink-safe, no referer required */
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Misano_World_Circuit_Marco_Simoncelli.jpg/1280px-Misano_World_Circuit_Marco_Simoncelli.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'circuit-de-nevers-magny-cours': {
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Circuit_de_Nevers_Magny-Cours-Northeast_side.jpg/1280px-Circuit_de_Nevers_Magny-Cours-Northeast_side.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  'nurburgring': {
    /* Wikimedia Commons — Nürburgring Mercedesarena aerial — hotlink-safe, verified 200 2026-03-13
       File: Nürburgring,_Mercedesarena_105x.jpg (MD5 prefix: 7/7c)
       Previous URL (nuerburgring.de official) redirected to homepage (hotlink blocked) */
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/N%C3%BCrburgring%2C_Mercedesarena_105x.jpg/1280px-N%C3%BCrburgring%2C_Mercedesarena_105x.jpg',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  /* ── GTWCE Teams — logo assets ─────────────────────────────────────────
     Car livery photos not available via reliable public URL at insertion time;
     update to kind:'car' once confirmed image sources are found.              */
  'akkodis-asp': {
    src:  'https://www.akkodisracing.com/assets/img/akkodis-asp-team-logo.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '12%',
    bg:   'var(--surface-muted)'
  },

  'iron-lynx': {
    /* SVG from ironlynx.com (site migrated from .it to .com; old path returned 404) — verified 200 2026-03-13 */
    src:  'https://www.ironlynx.com/wp-content/themes/IRON_LYNX/assets/img/logos/iron-lynx-motorsport-lab.svg',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '14%',
    bg:   'var(--surface-muted)'
  },

  'boutsen-vds': {
    src:  'https://www.boutsenvds.be/wp-content/uploads/2022/03/boutsen-vds-logo.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '12%',
    bg:   'var(--surface-muted)'
  },

  'haupt-racing-team': {
    src:  'https://www.hauptracing.com/assets/img/hrt-logo.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '12%',
    bg:   'var(--surface-muted)'
  },

  'manthey-ema': {
    /* PNG from manthey-racing.com (old .de path returned 404; site migrated) — verified 200 2026-03-13
       Note: positive (dark) logo; renders correctly on --surface-muted background */
    src:  'https://www.manthey-racing.com/themes/custom/grounded_manthey/src/images/30Years_Manthey_Logo_RGB_positiv.png',
    kind: 'logo',
    fit:  'contain',
    pos:  'center center',
    pad:  '12%',
    bg:   'var(--surface-muted)'
  },

  'emil-frey-racing': {
    // was: https://emilfreyracing.com/static/5f6060afd22983f8e634b02ecb154415/80f52/logo.png
    // (Gatsby content-hash path — would have silently broken on next site rebuild)
    src:    '../assets/logos/emil-frey-racing.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '14%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  /* ── GTWCE Athletes — portraits from the GTWCE driver portal ───────────
     Portrait IDs from https://www.gt-world-challenge-europe.com/en/driver/
     To verify IDs: open the driver's page and inspect the og:image tag.      */
  'charles-weerts': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3854.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'dries-vanthoor': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3855.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'jules-gounon': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3761.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'daniel-juncadella': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3742.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'luca-bortolotti': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3748.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  'franck-makowiecki': {
    src:  'https://www.gt-world-challenge-europe.com/images/drivers/photo_3763.png',
    kind: 'portrait',
    fit:  'cover',
    pos:  'center top'
  },

  /* timur-boguslavskiy — no confirmed portrait ID found; falls through to placeholder */

  'marco-varrone': {
    /* F2/VAR era studio portrait (2026-03-15). Clear identity confirmed: "N.VARRONE" name tag,
       Argentine flag. Not a GT3-context image — update to a GTWCE/Iron Lynx portrait once a
       stable source is confirmed. */
    src:    '../assets/portraits/nico-varrone-black-suit.jpg',
    kind:   'portrait',
    fit:    'cover',
    pos:    'center top',
    hosted: true
  },

  /* ── Premiership Rugby ecosystem ──────────────────────────────────────
     Team badge URLs from premiershiprugby.com CDN (incrowdsports.com / cortextech.io).
     Sourced from live premiershiprugby.com/clubs/ 2026-03-14.
     Venue: Wikimedia Commons aerial — hotlink-safe; MD5 path computed 2026-03-14.
     Athletes: all 11 fall through to placeholder hero icon (portrait URLs require
     club portal access — add via Control Room > Images or per-player sourcing).   */

  /* Series / governing body */
  'premiership-rugby': {
    /* Gallagher Premiership Rugby wordmark — locally hosted 2026-03-15
       was: https://media-cdn.cortextech.io/0708621a-5825-46bf-98c2-33b9e4f7c4fb.png */
    src:    '../assets/logos/premiership-rugby.png',
    kind:   'series',
    fit:    'contain',
    pos:    'center center',
    pad:    '18%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'premiership-rugby-ltd': {
    /* Governing body — reuse Gallagher Premiership wordmark, locally hosted 2026-03-15
       was: https://media-cdn.cortextech.io/0708621a-5825-46bf-98c2-33b9e4f7c4fb.png */
    src:    '../assets/logos/premiership-rugby-ltd.png',
    kind:   'series',
    fit:    'contain',
    pos:    'center center',
    pad:    '18%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  /* Venue */
  'allianz-stadium-twickenham': {
    /* Wikimedia Commons aerial — Twickenham_Stadium_Aerial.JPG (MD5 prefix: 1/1c) */
    src:  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Twickenham_Stadium_Aerial.JPG/1280px-Twickenham_Stadium_Aerial.JPG',
    kind: 'venue',
    fit:  'cover',
    pos:  'center center'
  },

  /* Teams — badge PNGs from premiershiprugby.com CDN */
  'bath-rugby': {
    // was: https://media-cdn.incrowdsports.com/f4d9a293-9086-41bf-aa1b-c98d1c62fe3b.png
    src:    '../assets/logos/bath-rugby.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'bristol-bears': {
    // was: https://media-cdn.incrowdsports.com/7952282c-a8b0-4e70-af53-906f215035c2.png
    src:    '../assets/logos/bristol-bears.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'exeter-chiefs': {
    // was: https://media-cdn.incrowdsports.com/434b059d-21e6-49ba-8d26-9af27fb98f19.png
    src:    '../assets/logos/exeter-chiefs.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'gloucester-rugby': {
    // was: https://media-cdn.incrowdsports.com/57109498-ebce-4d81-949a-c0bd84420813.png
    src:    '../assets/logos/gloucester-rugby.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'harlequins': {
    // was: https://media-cdn.incrowdsports.com/af0358f8-9fb4-415b-a13e-03f955d1bcc8.png
    src:    '../assets/logos/harlequins.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'leicester-tigers': {
    // was: https://media-cdn.cortextech.io/438e7cd5-fe7c-4002-897c-e702a579fbf1.png
    src:    '../assets/logos/leicester-tigers.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'newcastle-falcons': {
    /* Club rebranded as Newcastle Red Bulls 2024-25; DB slug remains newcastle-falcons
       was: https://media-cdn.cortextech.io/16fafbdc-a308-43b3-80bd-c4b1e8077290.png */
    src:    '../assets/logos/newcastle-falcons.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'northampton-saints': {
    // was: https://media-cdn.incrowdsports.com/f8cf95ed-e223-43ab-bae1-1b708d811c58.png
    src:    '../assets/logos/northampton-saints.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'sale-sharks': {
    // was: https://media-cdn.incrowdsports.com/ebb6895c-51ae-4403-9a82-470bb8eed534.png
    src:    '../assets/logos/sale-sharks.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'saracens': {
    /* was: https://media-cdn.cortextech.io/00ac0c8c-7562-4d0c-9d4e-dba7b72612b0.png
       cortextech URL returned AccessDenied; replaced with Wikipedia-sourced PNG (2026-03-15)
       Note: entity_images DB entry for saracens takes precedence at runtime */
    src:    '../assets/logos/saracens.png',
    kind:   'logo',
    fit:    'contain',
    pos:    'center center',
    pad:    '12%',
    bg:     'var(--surface-muted)',
    hosted: true
  },

  'maro-itoje': {
    /* Official Saracens club portrait, black StoneX kit (2026-03-15).
       Source: Saracens club photography. */
    src:    '../assets/portraits/maro-itoje.jpg',
    kind:   'portrait',
    fit:    'cover',
    pos:    'center top',
    hosted: true
  },

  /* finn-russell, sam-underhill, ellis-genge, henry-slade, ben-morgan, ben-youngs,
     alex-lozowski, george-ford, tommy-taylor, tom-curry-rugby —
     Portrait URLs require premiershiprugby.com player portal or direct club photography.
     Best sources: each club's Squad/Players page.
       Bath: bathrugby.com/players/
       Bristol: bristolbears.co.uk/players/
       Exeter: exeterchiefs.co.uk/players/
       Gloucester: gloucesterrugby.co.uk/players/
       Leicester: leicestertigers.com/players/
       Sale: salesharks.com/players/
       Saracens: saracens.com/players/                                               */

};

/* ── Event → Venue image reuse map ──────────────────────────────────────
   Events without a dedicated image fall back to their venue's image.
   Venue reuse is intentional for rounds at the same circuit.
──────────────────────────────────────────────────────────────────────────── */

var EVENT_VENUE_MAP = {
  /* British GT */
  'british-gt-brands-hatch-2024':           'brands-hatch',
  'british-gt-silverstone-500-2024':        'silverstone-circuit',
  'british-gt-spa-francorchamps-2024':      'circuit-de-spa-francorchamps',
  'british-gt-snetterton-2024':             'snetterton-circuit',
  'british-gt-oulton-park-2024':            'oulton-park',
  'british-gt-donington-park':              'donington-park',
  'british-gt-donington-park-2024-r4':      'donington-park',
  'british-gt-donington-park-2024-r8':      'donington-park',
  /* Cross-series */
  '24-hours-of-spa-2024':                   'circuit-de-spa-francorchamps',
  /* GTWCE Sprint Cup */
  'gtwce-sprint-cup-brands-hatch-2024':     'brands-hatch',
  'gtwce-sprint-misano-2024':               'misano-world-circuit',
  'gtwce-sprint-nurburgring-2024':          'nurburgring',
  /* GTWCE Endurance Cup */
  'gtwce-barcelona-2024':                   'circuit-de-barcelona-catalunya',
  'gtwce-monza-2024':                       'autodromo-nazionale-monza',
  'gtwce-paul-ricard-2024':                 'circuit-paul-ricard',
  'gtwce-misano-2024':                      'misano-world-circuit',
  'gtwce-magny-cours-2024':                 'circuit-de-nevers-magny-cours',
  'gtwce-nurburgring-2024':                 'nurburgring',
  /* Premiership Rugby */
  'premiership-rugby-final-2026':           'allianz-stadium-twickenham'
};

/* ── Image asset audit helper ────────────────────────────────────────────
   SAI_IMAGES — diagnostic utilities for image governance.
   Available in DevTools on any page that loads images.js.

   Usage:
     SAI_IMAGES.audit()   — full stats grouped by source host
     SAI_IMAGES.list()    — flat array suitable for console.table()
     SAI_IMAGES.risky()   — entries on known unstable hosts only

   None of these functions affect rendering. They read PROPERTY_IMAGES only.
──────────────────────────────────────────────────────────────────────────── */
var SAI_IMAGES = (function() {

  /* Hosts known to be unstable: official sites with hotlink risk,
     small team sites, third-party CDNs without an SLA, Gatsby hash paths. */
  var RISKY_HOSTS = [
    'silverstone.co.uk',
    'spa-francorchamps.be',
    'barwellmotorsport.co.uk',
    'emilfreyracing.com',
    'incrowdsports-cdn',
    'cortextech-cdn'
  ];

  /* Derive a canonical host label from a src URL.
     Returns 'local' for relative paths, otherwise a short label string. */
  function _host(entry) {
    /* Explicit override wins */
    if (entry.source_host) return entry.source_host;
    /* Local asset */
    if (entry.hosted || !entry.src || entry.src.indexOf('://') === -1) return 'local';
    var m = entry.src.match(/^https?:\/\/([^/]+)/);
    if (!m) return 'unknown';
    var h = m[1].replace(/^www\./, '');
    /* Normalise CDN labels */
    if (h === 'upload.wikimedia.org')           return 'wikimedia';
    if (h === 'media-cdn.incrowdsports.com')    return 'incrowdsports-cdn';
    if (h === 'media-cdn.cortextech.io')        return 'cortextech-cdn';
    if (h === 'msvstatic.blob.core.windows.net') return 'msv-azure-cdn';
    if (h === 'images.squarespace-cdn.com')     return 'squarespace-cdn';
    return h;
  }

  /* Build a flat array of all entries with derived metadata */
  function _entries() {
    return Object.keys(PROPERTY_IMAGES).map(function(slug) {
      var e    = PROPERTY_IMAGES[slug];
      var host = _host(e);
      return {
        slug:        slug,
        kind:        e.kind  || 'unknown',
        host:        host,
        hosted:      !!e.hosted,
        risky:       RISKY_HOSTS.indexOf(host) !== -1,
        src:         e.src   || ''
      };
    });
  }

  return {

    /* Full audit — grouped counts and per-host slug lists */
    audit: function() {
      var all    = _entries();
      var byHost = {};
      var risky  = [];

      all.forEach(function(e) {
        if (!byHost[e.host]) byHost[e.host] = [];
        byHost[e.host].push(e.slug);
        if (e.risky) risky.push(e.slug);
      });

      var result = {
        total:    all.length,
        local:    all.filter(function(e) { return e.hosted; }).length,
        external: all.filter(function(e) { return !e.hosted; }).length,
        risky:    risky.length,
        byHost:   byHost,
        riskyList: risky
      };

      /* Pretty-print to console */
      console.group('SAI_IMAGES.audit() — ' + result.total + ' entries');
      console.log('Local (hosted):  ', result.local);
      console.log('External:        ', result.external);
      console.log('Risky hosts:     ', result.risky, '—', risky.join(', ') || 'none');
      console.log('');
      Object.keys(byHost).sort().forEach(function(h) {
        var flag = RISKY_HOSTS.indexOf(h) !== -1 ? ' ⚠' : '';
        console.log(h + flag + ' (' + byHost[h].length + '): ' + byHost[h].join(', '));
      });
      console.groupEnd();

      return result;
    },

    /* Flat array for console.table() */
    list: function() {
      var rows = _entries().map(function(e) {
        return {
          slug:   e.slug,
          kind:   e.kind,
          host:   e.host,
          hosted: e.hosted,
          risky:  e.risky
        };
      });
      console.table(rows);
      return rows;
    },

    /* Only entries on risky hosts */
    risky: function() {
      var rows = _entries().filter(function(e) { return e.risky; });
      console.table(rows.map(function(e) {
        return { slug: e.slug, kind: e.kind, host: e.host, src: e.src };
      }));
      return rows;
    }

  };
}());
