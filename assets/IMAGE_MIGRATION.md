# SponsorAI Image Migration Reference

Status: Draft — 2026-03-15
Purpose: VA-ready spec for replacing all hotlinked or at-risk image URLs with locally hosted or self-hosted CDN assets.

---

## How to use this doc

1. Work through each row below in priority order.
2. For each entry, find the image using the search phrase or source listed.
3. Download the file and upload it to the project image bucket (e.g. S3, Cloudflare R2, or `assets/` folder for local testing).
4. Update `app/images.js` — replace the `src:` value with your new hosted URL.
5. Tick the row.

Naming convention for saved files: `{slug}.jpg` or `{slug}.svg` — match the `images.js` key exactly.

---

## Priority 1 — Currently broken or likely broken

These URLs have previously returned 404 or have a confirmed breakage risk.

| Slug | Current source | Image type | Search / source suggestion | Notes |
|---|---|---|---|---|
| `silverstone-circuit` | silverstone.co.uk (official site) | Aerial photo | Wikimedia Commons: search "Silverstone Circuit aerial" — file `Silverstone_Circuit_aerial.jpg` or `Silverstone_layout_2010.svg` | Official site likely blocks hotlinks; use CC aerial |
| `circuit-de-spa-francorchamps` | spa-francorchamps.be (official site) | Aerial photo | Wikimedia Commons: search "Circuit de Spa-Francorchamps SkySat aerial" — file `Circuit_de_Spa-Francorchamps_2022.jpg` or similar SkySat file | Same risk as Silverstone |
| `barwell-motorsport` | barwellmotorsport.co.uk (small team site) | Logo SVG/PNG | barwellmotorsport.co.uk — check /assets/logos/ or page source for SVG logo; alternatively download from team's Twitter/Instagram profile at high res | Small site; no CDN guarantee |
| `emil-frey-racing` | emilfreyracing.com (Gatsby content-hash) | Logo PNG | emilfreyracing.com — re-download direct from site header; Gatsby hash will change on next build. Prefer SVG if available on their brand assets page | **High risk — will silently break on site rebuild** |

---

## Priority 2 — Third-party CDNs with no SLA

These are working today but routed through CDNs you do not control.

### Rugby club badges — incrowdsports.com CDN

| Slug | Current URL fragment | Image type | Search / source suggestion |
|---|---|---|---|
| `bath-rugby` | incrowdsports.com UUID | Club badge PNG | bathrugby.com/brand or media — look for official crest SVG in page source or brand pack; alt: Wikimedia Commons "Bath Rugby crest" |
| `bristol-bears` | incrowdsports.com UUID | Club badge PNG | bristolbears.co.uk/media — official crest; alt: Wikimedia Commons "Bristol Bears logo" |
| `exeter-chiefs` | incrowdsports.com UUID | Club badge PNG | exeterchiefs.co.uk/brand — official crest; alt: Wikimedia Commons "Exeter Chiefs crest" |
| `gloucester-rugby` | incrowdsports.com UUID | Club badge PNG | gloucesterrugby.co.uk/brand — official crest; alt: Wikimedia Commons "Gloucester Rugby crest" |
| `harlequins` | incrowdsports.com UUID | Club badge PNG | quins.co.uk/brand or squad page — official crest; alt: Wikimedia Commons "Harlequins FC logo" |
| `northampton-saints` | incrowdsports.com UUID | Club badge PNG | northamptonsaints.co.uk/brand — official crest; alt: Wikimedia Commons "Northampton Saints logo" |
| `sale-sharks` | incrowdsports.com UUID | Club badge PNG | salesharks.com/brand — official crest; alt: Wikimedia Commons "Sale Sharks logo" |

### Rugby club badges — cortextech.io CDN

| Slug | Current URL fragment | Image type | Search / source suggestion |
|---|---|---|---|
| `leicester-tigers` | cortextech.io UUID | Club badge PNG | leicestertigers.com/brand — official crest; alt: Wikimedia Commons "Leicester Tigers logo" |
| `newcastle-falcons` | cortextech.io UUID | Club badge PNG | newcastlefalcons.co.uk — note: club rebranded as Newcastle Red Bulls 2024-25; check current badge; alt: Wikimedia Commons |
| `saracens` | cortextech.io UUID | Club badge PNG | saracens.com/brand — official crest; alt: Wikimedia Commons "Saracens FC logo" |
| `premiership-rugby` | cortextech.io UUID | Wordmark PNG | premiershiprugby.com brand assets — look for Gallagher Premiership SVG wordmark; alt: press kit PDF |
| `premiership-rugby-ltd` | cortextech.io UUID | Wordmark PNG | Same source as premiership-rugby; can reuse same file |

---

## Priority 3 — Missing portraits (showing placeholder icon today)

These have no image entry in `images.js` at all. All are visible in Explore.

### Motorsport

| Slug | Driver | Team | Series | Portrait source |
|---|---|---|---|---|
| `timur-boguslavskiy` | Timur Boguslavskiy | Akkodis ASP | GT World Challenge Europe | GTWCE portal: gt-world-challenge-europe.com/en/drivers — find driver page and inspect og:image for photo_XXXX.png ID |
| `callum-macleod` | Callum MacLeod | Unknown | British GT | britishgt.com/en/drivers — search by name; inspect og:image |

### Premiership Rugby athletes

| Slug | Player | Club | Position | Portrait source |
|---|---|---|---|---|
| `finn-russell` | Finn Russell | Bath Rugby | Fly-half | bathrugby.com/players/finn-russell — og:image or squad photo |
| `sam-underhill` | Sam Underhill | Bath Rugby | Flanker | bathrugby.com/players/sam-underhill |
| `ellis-genge` | Ellis Genge | Bristol Bears | Loosehead prop | bristolbears.co.uk/players/ellis-genge |
| `henry-slade` | Henry Slade | Exeter Chiefs | Centre | exeterchiefs.co.uk/players/henry-slade |
| `ben-morgan` | Ben Morgan | Gloucester Rugby | Number eight | gloucesterrugby.co.uk/players/ben-morgan |
| `ben-youngs` | Ben Youngs | Leicester Tigers | Scrum-half | leicestertigers.com/players/ben-youngs |
| `alex-lozowski` | Alex Lozowski | Saracens | Utility back | saracens.com/players/alex-lozowski |
| `george-ford` | George Ford | Sale Sharks | Fly-half | salesharks.com/players/george-ford |
| `tommy-taylor` | Tommy Taylor | Sale Sharks | Hooker | salesharks.com/players/tommy-taylor |
| `tom-curry-rugby` | Tom Curry | Sale Sharks | Flanker | salesharks.com/players/tom-curry |

---

## Priority 4 — Missing venue images (not yet visible in Explore)

These venues exist in the database but `visible_in_ui` is not set, so they do not currently appear in Explore. Images are not urgent but should be sourced before these are made visible.

| Slug | Venue | Club | Image type | Search / source suggestion |
|---|---|---|---|---|
| `kingsholm-stadium` | Kingsholm Stadium | Gloucester Rugby | Aerial or exterior | Wikimedia Commons: search "Kingsholm Stadium aerial" or "Kingsholm Ground Gloucester"; gloucesterrugby.co.uk/matchday for matchday photography |
| `the-recreation-ground-bath` | The Rec | Bath Rugby | Aerial or exterior | Wikimedia Commons: search "The Recreation Ground Bath aerial"; bathrugby.com/the-rec |
| `ashton-gate-stadium` | Ashton Gate | Bristol Bears | Aerial or exterior | Wikimedia Commons: search "Ashton Gate Stadium aerial"; bristolbears.co.uk/ashton-gate |
| `sandy-park` | Sandy Park | Exeter Chiefs | Aerial or exterior | Wikimedia Commons: search "Sandy Park stadium Exeter aerial"; exeterchiefs.co.uk/sandy-park |
| `the-stoop` | The Stoop | Harlequins | Aerial or exterior | Wikimedia Commons: search "The Stoop Twickenham aerial"; quins.co.uk/the-stoop |
| `welford-road` | Welford Road | Leicester Tigers | Aerial or exterior | Wikimedia Commons: search "Welford Road stadium aerial"; leicestertigers.com/welford-road |
| `cinch-stadium-franklins-gardens` | cinch Stadium | Northampton Saints | Aerial or exterior | Wikimedia Commons: search "Franklin's Gardens aerial" or "Northampton Saints stadium aerial" |
| `aj-bell-stadium` | AJ Bell Stadium | Sale Sharks | Aerial or exterior | Wikimedia Commons: search "AJ Bell Stadium aerial Salford"; salesharks.com/aj-bell-stadium |

---

## Assets already migrated locally (do not re-source)

These are stored in `assets/portraits/` and linked directly — no external dependency.

| Slug | File | Notes |
|---|---|---|
| `marco-varrone` | `nico-varrone-black-suit.jpg` | F2/VAR era portrait — update to GT3 context when GTWCE portal URL confirmed |
| `maro-itoje` | `maro-itoje.jpg` | Official Saracens black StoneX kit portrait |

---

## Implementation notes for developer

When you have a file ready to deploy:

```js
// Replace the src in images.js. Example:
'silverstone-circuit': {
  src:  'https://your-cdn.com/assets/silverstone-circuit.jpg',  // was: silverstone.co.uk hotlink
  kind: 'venue',
  fit:  'cover',
  pos:  'center center'
},
```

For logos and wordmarks, also set `kind: 'logo'` or `kind: 'series'` and add `pad: '12%'` with `bg: 'var(--surface-muted)'`.

There is no asset versioning system in place. Until a CDN with cache-busting is set up, keep the old URL in a comment above the new src for rollback reference.
