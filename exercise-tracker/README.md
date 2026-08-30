# Exercise Tracker

A goal-based gym & home workout tracker you install as an app on your Android
phone — no app store, no backend server, works fully offline. Built as a
static Progressive Web App (PWA): plain HTML/CSS/JavaScript, no build step,
no framework.

## Features

- **Onboarding** — tell it your experience level, goal (strength,
  hypertrophy, fat loss, general fitness, endurance), where you train
  (gym/home/both) and days per week.
- **Default programs for every level** — 8 built-in programs spanning
  beginner/intermediate/advanced, gym and home/bodyweight, matched to your
  goal. Pick one and it's cloned into your own editable copy.
- **Home workout plans** — dedicated no-equipment bodyweight programs
  (full-body, conditioning, calisthenics) alongside the gym ones.
- **Fully editable programs** — add/remove days and exercises, change sets,
  rep ranges, target weight, rest time, and the progression rule per
  exercise.
- **Workout logging** — log weight/reps/RPE per set (with an optional
  warm-up flag) against your program's prescription.
- **Automatic weight suggestions** — after each logged session, a small
  progressive-overload engine decides what to prescribe next: add weight,
  hold, raise the rep target, or deload after repeated misses. See
  `js/progression.js` for the rules.
- **Progress graphs** — per-exercise estimated 1RM / top-weight trend line,
  and weekly training volume, rendered with a locally-vendored Chart.js (no
  network needed).
- **Works offline** — a service worker caches the whole app shell; your data
  lives in IndexedDB on your phone.

## Install on your Android phone

1. Host this folder anywhere reachable over HTTPS (or `http://localhost` /
   your LAN IP for local testing — service workers also work over plain
   `http://localhost`). Any static host works: GitHub Pages, Netlify,
   Vercel, `python3 -m http.server`, `npx serve`, etc. — there is no backend
   to deploy.
2. Open that URL in Chrome on your phone.
3. Tap the **⋮** menu → **Add to Home screen** (Chrome may also show an
   automatic "Install app" prompt/banner).
4. Launch it from the home screen icon — it opens full-screen, no browser
   bars, and keeps working without a network connection after the first
   load.

### Try it locally first

```bash
cd exercise-tracker
python3 -m http.server 8000
# or: npx serve .
```

Then open `http://<your-computer-LAN-IP>:8000` on your phone (same Wi-Fi),
or `http://localhost:8000` in a desktop browser to click through it first.

## How it's put together

```
exercise-tracker/
  index.html              App shell (single page; view swapped by a tiny hash router)
  manifest.webmanifest    Installability metadata (icons, name, standalone display)
  service-worker.js       Offline app-shell caching
  css/styles.css          Mobile-first styling, light/dark aware
  icons/                  Generated app icons
  js/
    app.js                Hash router + all view rendering + event handling
    db.js                 IndexedDB wrapper; seeds the exercise library & default programs
    catalog.js            Program recommendation + template → editable-copy cloning
    progression.js         The weight/rep suggestion engine
    stats.js               Chart data: estimated 1RM, weekly volume
    charts.js              Thin Chart.js rendering helpers
    util.js                 Small shared helpers (dates, ids, escaping)
    data/exercises.js       Seed exercise library (~50 gym + bodyweight movements)
    data/programs.js        The 8 default programs
    vendor/chart.umd.min.js Vendored Chart.js (offline charts, no CDN)
```

All data (your profile, programs, and logged workouts) is stored locally in
your browser's IndexedDB — nothing leaves your phone, and there's no
account or server. Uninstalling the app or clearing site data removes it.

## Progression rules (how weight suggestions work)

Each exercise in a program has a `progressionType`:

- **linear_weight** — for the big barbell lifts at a fixed rep target: hit
  every set → add weight next time; land inside the range but short of the
  top → repeat the weight; miss the rep target twice in a row → deload 10%.
- **double_progression** — for accessory/machine work over a rep range
  (e.g. 8–12): climb reps across the range before adding weight, then reset
  reps back to the bottom of the range.
- **bodyweight_reps** — no external weight: raise the rep (or seconds-held)
  target once every set clears the top of the range.
- **static** — fixed prescription, no auto-progression.

You can change any exercise's progression type, rep range, or weight
increment from the program editor.
