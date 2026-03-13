# British GT 2024 -- Expansion Seed Reference

Status: DRAFT ONLY -- NOT FOR EXECUTION
Date: 2026-03-13
Purpose: Track all unverified entities excluded from the confirmed-only seed.
Prerequisite: Each item below must be independently verified before being promoted to executable SQL.

---

## What is Already Inserted (confirmed-only seed)

| Entity | Property type | Status |
|---|---|---|
| British GT Championship | series | confirmed, inserted |
| SRO Motorsports Group | governing_body | confirmed, inserted |
| Oulton Park | venue | confirmed, inserted |
| Silverstone Circuit | venue | confirmed, inserted |
| Donington Park | venue | confirmed, inserted |
| Snetterton Circuit | venue | confirmed, inserted |
| Circuit de Spa-Francorchamps | venue | confirmed, inserted |
| Brands Hatch | venue | confirmed, inserted |
| Barwell Motorsport | team | confirmed, inserted |
| 2 Seas Motorsport | team | confirmed, inserted |
| Blackthorn Motorsport | team | confirmed, inserted |
| Rob Collard | athlete | confirmed, inserted |
| Ricky Collard | athlete | confirmed, inserted |
| Phil Keen | athlete | confirmed, inserted |
| Ian Loggie | athlete | confirmed, inserted |
| Jonny Adam | athlete | confirmed, inserted |
| Giacomo Petrobelli | athlete | confirmed, inserted |

---

## Events (all 7 rounds -- dates unverified)

All British GT 2024 round dates are approximate. Do not insert events or
`series_contains_event` / `event_at_venue` relationships until exact dates
are confirmed from the official British GT calendar or results archive.

| Round | Venue | Approx date | Needs verification |
|---|---|---|---|
| Round 1 | Oulton Park | April 2024 | Exact date |
| Round 2 | Silverstone | May 2024 | Exact date |
| Round 3 | Donington Park | June 2024 | Exact date |
| Round 4 | Snetterton | July 2024 | Exact date |
| Round 5 | Spa-Francorchamps | August 2024 | Exact date (continental round) |
| Round 6 | Brands Hatch | September 2024 | Exact date |
| Round 7 (finale) | Brands Hatch | October 2024 | Exact date; confirm if this is a separate round or doubleheader |

Note: some rounds are doubleheaders (two races at the same venue in one weekend).
The event model should represent one property per race weekend, not per individual race.
Confirm the exact round structure before inserting events.

---

## Teams (unverified entries)

The following teams competed in British GT 2024 but pairings, car numbers, or
class assignments have not been independently verified for this seed.

| Team name | Manufacturer | Approx class | Needs verification |
|---|---|---|---|
| TF Sport | Aston Martin Vantage GT3 | Pro-Am / Am | Driver pairing, car number, class |
| Optimum Motorsport | McLaren 720S GT3 Evo | Pro / Pro-Am | Driver pairing, car number |
| Garage 59 | McLaren 720S GT3 Evo | Pro | Driver pairing, car number |
| RAM Racing | Mercedes-AMG GT3 Evo | Pro-Am | Driver pairing, car number |
| Century Motorsport | BMW M4 GT3 | Pro-Am | Driver pairing, car number |
| Balfe Motorsport | McLaren 720S GT3 Evo | Am | Driver pairing, car number |
| FF Corse | Ferrari 296 GT3 | Am | Driver pairing, car number |
| Paddock Motorsport | McLaren 720S GT3 Evo | Am | Driver pairing, car number |
| Steller Motorsport | Audi R8 LMS GT3 | Am | Driver pairing, car number |

Note: team count is approximate. British GT 2024 ran approximately 15-20 GT3 entries
plus a GT4 class. The above list covers GT3 Pro-Am and Am entries only.
GT4 class entries are a separate expansion scope and should be considered separately.

---

## Athletes (unverified entries)

Athletes 7-20 and all GT4-class drivers are excluded from the confirmed-only seed.
Pairings below are approximate and must be verified before insertion.

| Driver name | Approx team | Approx class/role | Needs verification |
|---|---|---|---|
| Tom Gamble | Optimum Motorsport | Pro | Confirm team, car number, pairing |
| Andrew Watson | TF Sport or other | Pro | Confirm team, car number, pairing |
| Ben Tuck | TF Sport | Am | Confirm team, car number, pairing |
| Lewis Proctor | Century Motorsport | Am | Confirm team, car number, pairing |
| Sandy Mitchell | Garage 59 | Pro | Confirm team, car number, pairing |
| Callum Macleod | Garage 59 | Pro | Confirm team, car number, pairing |

Note: this list is illustrative, not exhaustive. Full 2024 entry list must be
sourced from the official British GT results archive before any athlete beyond
the 6 confirmed entries is inserted.

---

## Metadata still needed for confirmed entries

The following metadata items apply to already-confirmed entities but have not
been verified precisely enough for inclusion.

| Entity | Field | Gap |
|---|---|---|
| 2 Seas Motorsport (athlete_belongs_to_team) | car_number | Not confirmed in available sources |
| Giacomo Petrobelli | country_code | Nationality not confirmed |
| Rob Collard | date_of_birth | Not included in seed |
| Ricky Collard | date_of_birth | Not included in seed |
| Phil Keen | date_of_birth | Not included in seed |
| Ian Loggie | date_of_birth | Not included in seed |
| Jonny Adam | date_of_birth | Not included in seed |
| Giacomo Petrobelli | date_of_birth | Not included in seed |
| All venues | latitude / longitude | Not included; useful for mapping |
| British GT Championship | property_metrics (founded, classes, rounds) | Deferred to Phase 2 / property_metrics backfill |

---

## Promotion checklist

When verifying an item for promotion to executable SQL:

1. Confirm entity identity (correct legal name, correct team affiliation)
2. Confirm country_code is strict ISO 3166-1 alpha-2
3. Confirm car number where applicable
4. Confirm event dates from official calendar or results archive
5. Confirm class (Pro / Am / Pro-Am / Silver-Am) from official timing sheets
6. Write INSERT in the same DO $$ block pattern as the confirmed seed
7. Test in a staging query before applying to production
8. Update this document to move the item from pending to confirmed
