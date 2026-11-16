# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Into the Computer is a five-lesson unit on how computers work, from the parts down to bits, for sixth grade. It is a sibling of Pixel Trail (github.com/perkinscole/p5-lessons) and reuses its structure. See `README.md` for the unit and the teacher's deployment steps.

## Requirements from the teacher

- **It must run entirely on Google Apps Script**, with data in a Google Sheet the teacher owns and sign-in through school Google accounts. No outside hosting, databases, or services. Sketchfab embeds are the one approved exception, and every lesson must work without them.
- **Students get overwhelmed by on-screen text.** One step on screen at a time, one instruction of 26 words or fewer, explanations folded under "Why?", a read-aloud button, and check questions of 18 words or fewer with three choices that must be answered to move on. The tests enforce the limits.
- Lessons are hands-on activities, not a code editor.
- XP, ranks, and badges are visible to classmates, so they must never be calculated from grades, or from approval.
- Standard text in `js/curriculum/standards.js` is quoted verbatim from the 2016 Massachusetts framework PDF. Never reword it; `tests/curriculum.test.mjs` checks it against `tests/fixtures/ma-dlcs-6-8.txt`.
- Write to the teacher in plain language, not developer jargon.

## Commands

```bash
npm install     # once, for esbuild
npm start       # the packed app with the real server on a fake Sheet, at :8080; pick who to be
npm test        # curriculum, server access rules, and the packed files
npm run build   # regenerate dist/
```

Run one test: `node --test --test-name-pattern="quoted exactly" tests/curriculum.test.mjs`

`dist/` is committed and is what the teacher pastes into Apps Script, so run `npm run build` after any change to `js/`, `css/`, or `gas/`. There is no linter.

## Architecture

Plain ES modules with no framework. `tools/build.mjs` bundles `js/main.js` with esbuild into `dist/`, because Apps Script only accepts `.gs` and `.html` files.

### Apps Script lessons from Pixel Trail, designed in from the start

- Every HTML file must start as HTML, or Apps Script rejects it as "Malformed HTML content."
- Apps Script rewrites inline JavaScript and broke a large bundle, so the app ships as base64 in a `text/plain` script tag in `App.html`, decoded by a tiny ES5 loader.
- Fonts load with `media="print" onload`, so a school filter that stalls them can't leave a blank page. `gas/Index.html` shows the reason on screen if the app fails to start.
- The tab icon can only be set with `setFaviconUrl` and an image link.
- `tests/build.test.mjs` checks all of these on the built files.

### One server, one door

`gas/Code.gs` is the real server. `api()` is the only entry point. It determines the user from `Session.getActiveUser()`, never from the browser, then dispatches through `TEACHER_ROUTES` or `STUDENT_ROUTES`. Top-level functions without a trailing `_` can be called from the browser, so helpers must end in `_`; a test checks that only `api` and `doGet` are public. Google Classroom routes and the 3D model switch must call `ownerOnly_`, because the app runs with the deploying teacher's access.

- Each table is a Sheet tab in `SCHEMA`. Cells hold plain text; `encText_` prefixes anything that could act as a formula. Once real data exists, a new `Works` field goes in `WORK_TAIL`, after the `dataN` columns. Never insert a column before existing ones.
- A student's answers for a lesson are one JSON object in the `dataN` columns, keyed by step id, plus `_checks` for first-try results of check questions.
- `classBoard_` is what classmates see. It must never include answers, reflections, links, grades, approval status, or emails.
- The `link` column and `js/shared/links.js` (`cleanLink_`) are from an earlier version where history reports were handed in as links. The browser no longer sends a link; they stay so existing Sheets keep their columns.
- Files in `js/shared/` run on both sides: the build strips `export` and appends them to `Code.gs`. They can't import anything, and their names end in `_`.

`js/data/store.js` is the browser's side. Calls made at the same moment travel as one `batch` (each trip costs about a second), and read-only answers in `READS` are reused for 15 seconds; any other call clears that cache. Views should start all their calls together with `Promise.all`. A new server route must be added to `METHODS`; a test checks the two lists match. Students save at most every 30 seconds (`saveEvery`) while working, plus when they leave a lesson or submit, because a whole class shares one account's quota.

`npm start` (`tools/local.mjs`) runs the packed `dist/` files with the real `Code.gs` behind them on `tests/fake-gas.mjs`, which imitates Google's services, including the cell size limit and formula behavior. Sample data comes from `tools/sample.mjs` and is saved in `.local/`. It is a model: real Apps Script can still behave differently.

### Lessons are data

`js/curriculum/lessons.js` holds the five lessons. Lesson 5 is the project, one class period: a `choose` step picks a track (`design` or `history`), each with its own steps, rubric, and stretch goals. Design parts and prices are in `js/curriculum/catalog.js` (`estimate: true` marks a typical price where no current one was found); history computers each have a Kiddle and a Wikipedia link. `stepsFor(lesson, track)` gives the steps a student sees.

A step that needs facts students haven't met yet has `learn`: up to 3 short facts (20 words or fewer each, with an emoji) shown on their own screen before the step. Teach before asking: an activity or check question must only rely on facts already shown in a Learn screen, an instruction, or a card. Don't hide them under "Why?", which is for the deeper reason. A test checks key check questions against what came before.

Each step's `activity` has a `type`. `js/activities/logic.js` holds the rules for each type with no page code: `initial`, `isDone`, `solve`, and `summary` (what the teacher sees). `js/activities/ui.js` draws them. A new activity type needs all four rules and a renderer, and the tests will solve it and check that a fresh start isn't already done.

The tests enforce: step minutes plus `finishMins` equal the lesson's minutes for every track, word limits, three choices per check question with right answers spread across positions, a three-row rubric scored 1 to 4, an alignment entry with standards that exist, and models that exist.

### 3D models

`js/curriculum/models.js` lists Sketchfab models, each shown in Sketchfab's viewer with its credit. Most are CC BY; `embedOnly` marks one with no Creative Commons license, which may be embedded but not downloaded or reused. A model loads only when a student presses "See it in 3D". The teacher can switch any off; the list is stored in the `Settings` tab and sent with the session.

## Not yet verified

Needs a real deployment: anything on real Apps Script, the Google Classroom API (including grade writes), full-class quota limits, Sketchfab embeds inside Apps Script's frame on a school network, and read-aloud voices on Chromebooks.
