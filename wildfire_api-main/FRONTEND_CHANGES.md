# Frontend changes — branch `fix/season-and-location`

Handover notes for the frontend developer. Four frontend files changed. Nothing here
requires a backend deploy to be safe: every change is backward compatible with the
currently deployed API.

## TL;DR

| File | Change | Why |
|---|---|---|
| `lib/wildfireApi.ts` | season formula corrected; now sends `doy` | season disagreed with the dataset for Mar/Jun/Sep/Dec |
| `types/wildfire.ts` | added `doy?: number` to `WildfireFeatures` | so the above type-checks |
| `components/USRiskHeatmap.tsx` | click sends the clicked dot; hit-testing rewritten | clicking a dot analysed the wrong place |
| `app/api/*/route.ts` (4 files) | backend URL now env-configurable | could not test against a local API |

---

## 1. `lib/wildfireApi.ts` — season formula

```diff
- const seasonFromDate = monthFromDate ? (Math.floor((monthFromDate - 1) / 3) + 1) : undefined;
+ const seasonFromDate = monthFromDate ? (Math.floor((monthFromDate % 12) / 3) + 1) : undefined;
```

The dataset labels seasons meteorologically: Dec/Jan/Feb = 1, Mar/Apr/May = 2,
Jun/Jul/Aug = 3, Sep/Oct/Nov = 4. Verified against 725,397 rows of the real data.

The old formula was wrong for every quarter-start month:

| Month | Dataset | Old formula | New formula |
|---|---|---|---|
| March | 2 | 1 (wrong) | 2 |
| June | 3 | 2 (wrong) | 3 |
| September | 4 | 3 (wrong) | 4 |
| December | 1 | 4 (wrong) | 1 |

July and August happen to agree, which is why nothing looked broken over the summer.

## 2. `lib/wildfireApi.ts` — send the real `doy`

`doy` was computed from the picked date and then never added to the payload. The
backend therefore imputed it from a nearest-neighbour average, so the map showed
historical fires from the wrong time of year. Now sent when present.

## 3. `components/USRiskHeatmap.tsx` — the important one

**Click now analyses the dot you clicked.** It previously passed `wildfireResponse`
(the side-panel forecast) no matter which dot was clicked, so the assistant described a
different location. Reproduced live: clicking Shawnee, Kansas returned an analysis of
Cochise County, Arizona.

The payload is now built from the clicked point, and `risk_events` is stripped because
the backend never reads it. Request size drops from about 42 KB to about 2 KB.

**Hit-testing rewritten.** Both handlers previously took the nearest dot *centre* within
30px. DeckGL paints in array order, so overlapping dots hide earlier ones and
"nearest centre" often returned a dot underneath the visible one. Measured against the
real 388-event dataset from the live map:

| | Before | After |
|---|---|---|
| Wrong dot returned | 42.4% | 0.0% |
| Wrong county returned | 24.9% | 0.0% |
| Selected a dot on empty map | 73.4% | 38.7% |

`pickEventAt` is now shared by hover and click. It prefers the top-painted dot covering
the cursor, and falls back to the nearest centre only within `DOT_RADIUS_PX + 4`.

> **Keep in sync:** `DOT_RADIUS_PX = 8` must match `radiusMinPixels` on the
> `ScatterplotLayer`. Note `getRadius` returns metres (~1), which is sub-pixel at these
> zooms, so `radiusMinPixels` always wins and every dot renders at exactly 8px. The
> risk-based size variation the code comments describe never actually renders.

## 4. `app/api/*/route.ts` — configurable backend URL

All four proxy routes hardcoded the production Cloud Run URL, so `npm run dev` always
hit production and local backend changes were untestable.

```diff
- const WILDFIRE_API_BASE_URL = 'https://wildfire-api-....run.app';
+ const WILDFIRE_API_BASE_URL = process.env.WILDFIRE_API_BASE_URL || 'https://wildfire-api-....run.app';
```

**Production behaviour is unchanged** when the variable is unset. Nothing to do in
Vercel unless you want to point a preview at a different API.

---

## Running locally

Create `frontend/.env.local`:

```
WILDFIRE_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_MAP_STYLE=https://api.maptiler.com/maps/pastel/style.json?key=iGGFxV3g3yuA0RvsnqQ0
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

The three Firebase values live only in Vercel env settings or the Firebase console.
Next reads env at startup, so restart `npm run dev` after creating the file.

To point at the dev API instead of a local one:
`WILDFIRE_API_BASE_URL=https://wildfire-api-dev-575281815403.us-central1.run.app`

## What to verify

1. Pick a state, leave county blank, set the date to today, press Refresh Data.
   Dots should appear in the selected state.
2. Click a dot in a different county. **The tooltip county and the county Fact Finder
   names must match.** This was the original bug.
3. Repeat with the date set to March 15, June 15 and September 15, the months the old
   season formula got wrong.
4. Check the network tab: the `/api/ai-assistant` request body should be about 2 KB and
   its `imputed.county` should equal the dot you clicked.

## Verified

`npx tsc --noEmit` passes clean. `next build` compiles; it only fails at the prerender
step when Firebase env vars are absent, which is expected locally.

## Still open — needs a product decision

When a dot is clicked, the payload keeps the forecast's weather values and duration
prediction and overrides only location and risk. Making the predictions genuinely belong
to the clicked point would require calling `/predict` for that point on every click.
That was not done, to avoid adding a request per click.
